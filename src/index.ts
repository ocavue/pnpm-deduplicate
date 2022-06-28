import type { ProjectManifest } from "@pnpm/types";
import { execSync } from "child_process";
import * as dp from "dependency-path";
import fs from "fs/promises";
import path from "path";
import semver from "semver";
import {
  readWantedLockfile,
  type Dependencies,
} from "./commonjs-libs/pnpm-lock-files";
import { nameVerFromPkgSnapshot } from "./commonjs-libs/pnpm-lock-utils";
import {
  lockfileWalker,
  type LockfileWalkerStep,
} from "./commonjs-libs/pnpm-lockfile-walker";
import { getAllDependenciesFromManifest } from "./commonjs-libs/pnpm-manifest-utils";
import {
  readProjectManifest,
  safeReadProjectManifestOnly,
} from "./commonjs-libs/pnpm-read-project-manifest";

type Package = {
  name: string;
  specifier: string;
  version: string;
  bestVersion?: string;
};

type PackageMap = { [key: string]: Package };

const MAX_DEPTH = 100;

async function walkLockfile(
  root: string,
  step: LockfileWalkerStep,
  specifiers: Dependencies,
  packageMap: PackageMap,
  depth = 1
) {
  if (depth > MAX_DEPTH) return;

  await Promise.all(
    step.dependencies.map(async (dep) => {
      const { depPath, pkgSnapshot } = dep;
      const { name, version } = nameVerFromPkgSnapshot(depPath, pkgSnapshot);

      const specifier = specifiers[name];

      if (name && version && specifier) {
        const key = `${name}#${version}#${specifier}`;
        packageMap[key] = { name, version, specifier };
      }

      // TODO: read config instead of hardcoded value
      const virtualStoreDir = path.join(root, "node_modules", ".pnpm");
      const modules = path.join(
        virtualStoreDir,
        dp.depPathToFilename(depPath),
        "node_modules"
      );
      const dir = path.join(modules, name);
      const manifest: ProjectManifest =
        (await safeReadProjectManifestOnly(dir)) || {};

      await walkLockfile(
        root,
        dep.next(),
        getAllDependenciesFromManifest(manifest),
        packageMap,
        depth + 1
      );
    })
  );
}

async function getAllDependencies(root: string): Promise<Package[]> {
  const lockfile = await readWantedLockfile(root, { ignoreIncompatible: true });
  if (!lockfile) {
    throw new Error(`failed to find pnpm-lock.yaml in ${root}`);
  }
  const packageMap: PackageMap = {};
  await Promise.all(
    Object.entries(lockfile.importers).map(([importer, projectSnapshot]) =>
      walkLockfile(
        root,
        lockfileWalker(lockfile, [importer]).step,
        projectSnapshot.specifiers,
        packageMap
      )
    )
  );
  return Object.values(packageMap);
}

function getDuplicates(packages: Package[]): Package[] {
  const candidateVersions = Array.from(
    new Set(packages.map((pkg) => pkg.version))
  );
  if (candidateVersions.length <= 1) {
    return [];
  }

  candidateVersions.sort((versionA: string, versionB: string) => {
    return semver.rcompare(versionA, versionB);
  });

  for (let pkg of packages) {
    for (let candidateVersion of candidateVersions) {
      if (semver.satisfies(candidateVersion, pkg.specifier)) {
        pkg.bestVersion = candidateVersion;
        break;
      }
    }
  }

  return packages.filter(
    (pkg) => pkg.bestVersion && pkg.bestVersion !== pkg.version
  );
}

async function findDuplicatePackages(root: string) {
  const packages = await getAllDependencies(root);
  const packageGroups: Record<string, Package[]> = {};
  for (let pkg of packages) {
    if (!packageGroups[pkg.name]) {
      packageGroups[pkg.name] = [];
    }
    packageGroups[pkg.name].push(pkg);
  }
  const duplicatePackages: Package[] = [];
  for (const packagesWithSameName of Object.values(packageGroups)) {
    duplicatePackages.push(...getDuplicates(packagesWithSameName));
  }
  return duplicatePackages;
}

function buildOverrides(packages: Package[]) {
  const overrides: { [packageName: string]: string } = {};
  for (let pkg of packages) {
    overrides[`${pkg.name}@${pkg.specifier}`] = pkg.bestVersion;
  }
  return overrides;
}

async function writeOverride(root: string, duplicatePackages: Package[]) {
  const { fileName, manifest, writeProjectManifest } =
    await readProjectManifest(root);

  const manifestPath = path.resolve(root, fileName);
  const manifestText = await fs.readFile(manifestPath, { encoding: "utf-8" });

  const overrides = buildOverrides(duplicatePackages);
  const newManifest: ProjectManifest = {
    ...manifest,
    pnpm: {
      ...manifest.pnpm,
      overrides: {
        ...manifest.pnpm?.overrides,
        ...overrides,
      },
    },
  };

  await writeProjectManifest(newManifest);

  const restoreManifest = () => fs.writeFile(manifestPath, manifestText);
  return restoreManifest;
}

function runPnpmInstall(root: string) {
  // Use `--prefer-offline` and `--ignore-scripts` here to increase the install
  // speed. Use `--no-frozen-lockfile` to make sure the lockfile can be updated
  // even in the CI environment.
  execSync(
    "pnpm install --prefer-offline --ignore-scripts --no-frozen-lockfile",
    { stdio: "inherit", cwd: root }
  );
}

function logDuplicatePackages(duplicatePackages: Package[]) {
  for (let { name, version, bestVersion, specifier } of duplicatePackages) {
    console.log(
      `Package "${name}" wants ${specifier} and could get ${bestVersion}, but got ${version}`
    );
  }
}

export async function fixDuplicates(root: string) {
  // Run `pnpm install` to make sure dependencies are downloaded
  runPnpmInstall(root);
  // Find duplicate dependencies
  const duplicatePackages = await findDuplicatePackages(root);
  // Print duplicate dependencies to console
  logDuplicatePackages(duplicatePackages);
  // Write `override` into the root package.json
  const restoreManifest = await writeOverride(root, duplicatePackages);
  // Run `pnpm install` and let pnpm remove unnecessary dependencies
  runPnpmInstall(root);
  // Restore the original package.json
  await restoreManifest();
  // Run `pnpm install` to remove the `override` information in the lockfile
  runPnpmInstall(root);
}

export async function listDuplicates(root: string) {
  // Run `pnpm install` to make sure dependencies are downloaded
  runPnpmInstall(root);
  // Find duplicate dependencies
  const duplicatePackages = await findDuplicatePackages(root);
  // Print duplicate dependencies to console
  logDuplicatePackages(duplicatePackages);
}
