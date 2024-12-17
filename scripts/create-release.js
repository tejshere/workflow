import { Octokit } from '@octokit/rest';
import fs from 'fs';
import path from 'path';
import semver from 'semver';
import packageJson from '../package.json' assert { type: 'json' };
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Configuration loading
const loadConfig = () => {
  console.log('repository', packageJson.repository);
  console.log('version', packageJson.version);
  console.log('GITHUB_TOKEN', process.env.GITHUB_TOKEN);
  if (!process.env.GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN environment variable is required');
  }
  return {
    token: process.env.GITHUB_TOKEN,
    owner: packageJson.repository.split('/')[0],
    repo: packageJson.repository.split('/')[1],
    currentVersion: packageJson.version
  };
};

// Update package.json version
const updatePackageVersion = (newVersion) => {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  packageJson.version = newVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
};

// Update CHANGELOG.md
const updateChangelogFile = (version, description) => {
  const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
  const date = new Date().toISOString().split('T')[0];
  let content = '';

  if (fs.existsSync(changelogPath)) {
    content = fs.readFileSync(changelogPath, 'utf8');
  }

  const newRelease = `
# ${version} (${date})

${description}

---
`;

  fs.writeFileSync(changelogPath, newRelease + content);
};

// Create GitHub release
const createGithubRelease = async (config, version, description) => {
  const octokit = new Octokit({ auth: config.token });

  await octokit.repos.createRelease({
    owner: config.owner,
    repo: config.repo,
    tag_name: `v${version}`,
    name: `Version ${version}`,
    body: description,
    draft: false,
    prerelease: false
  });
};

// Main function
const createRelease = async () => {
  try {
    // Get release type and description from command line arguments
    const releaseType = process.argv[2]; // major, minor, or patch
    const description = process.argv[3];

    if (!releaseType || !description) {
      console.error('Usage: npm run release [major|minor|patch] "Release description"');
      process.exit(1);
    }

    // Load configuration
    const config = loadConfig();

    // Calculate new version
    const newVersion = semver.inc(config.currentVersion, releaseType);
    if (!newVersion) {
      throw new Error('Invalid version increment');
    }

    // Update package.json
    updatePackageVersion(newVersion);
    console.log(`Updated package.json version to ${newVersion}`);

    // Update CHANGELOG.md
    updateChangelogFile(newVersion, description);
    console.log('Updated CHANGELOG.md');

    // Create GitHub release
    await createGithubRelease(config, newVersion, description);
    console.log(`Created GitHub release v${newVersion}`);

  } catch (error) {
    console.error('Error creating release:', error);
    process.exit(1);
  }
};

void createRelease();

// loadConfig();