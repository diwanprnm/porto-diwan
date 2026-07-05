import { promises as fs } from "fs";
import path from "path";

const PROFILE_PATH = path.join(process.cwd(), "content", "profile.json");

export type ProfileData = {
  profile: {
    name: string;
    title: string;
    image: string;
    bio: string;
    about: string;
    contact: {
      location: string;
      email: string;
    };
  };
  education: {
    school: string;
    degree: string;
    period: string;
  };
  skills: string[];
  socials: { platform: string; url: string; icon: string }[];
  experience: {
    period: string;
    title: string;
    highlights: string[];
    skills: string[];
  }[];
  projects: {
    name: string;
    client: string;
    image: string;
    github_url: string;
    description: string | string[];
    skills: string[];
  }[];
  __meta: { version: number; updated_at: string };
};

// Client-side readable (no fs)
// In production, fetch from API; in dev, import directly
// This module is for SERVER usage only (API routes, getStaticProps equivalent)

export async function getProfileData(): Promise<ProfileData> {
  const raw = await fs.readFile(PROFILE_PATH, "utf-8");
  return JSON.parse(raw);
}

export async function saveProfileData(data: ProfileData): Promise<void> {
  // Update meta
  data.__meta.version = (data.__meta.version || 0) + 1;
  data.__meta.updated_at = new Date().toISOString();
  const json = JSON.stringify(data, null, 2);
  await fs.writeFile(PROFILE_PATH, json, "utf-8");
}