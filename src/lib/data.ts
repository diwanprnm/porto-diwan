import { promises as fs } from "fs";
import path from "path";

const PROFILE_PATH = path.join(process.cwd(), "content", "profile.json");

export type Skill = {
  name: string;
  category: string;
};

export type Social = {
  platform: string;
  url: string;
  icon: string;
};

export type Experience = {
  period: string;
  title: string;
  company: string;
  highlights: string[];
  skills: string[];
};

export type Project = {
  name: string;
  client: string;
  image: string;
  github_url: string;
  description: string | string[];
  skills: string[];
};

export type Language = {
  name: string;
  level: string;
};

export type ProfileData = {
  profile: {
    name: string;
    title: string;
    image: string;
    bio: string;
    about: string;
  };
  contact: {
    location: string;
    email: string;
    phone: string;
    website: string;
  };
  education: {
    school: string;
    degree: string;
    period: string;
    gpa: string;
  };
  skills: Skill[];
  socials: Social[];
  experience: Experience[];
  projects: Project[];
  languages?: Language[];
  __meta: { version: number; updated_at: string };
};

export async function getProfileData(): Promise<ProfileData> {
  const raw = await fs.readFile(PROFILE_PATH, "utf-8");
  return JSON.parse(raw);
}

export async function saveProfileData(data: ProfileData): Promise<void> {
  data.__meta.version = (data.__meta.version || 0) + 1;
  data.__meta.updated_at = new Date().toISOString();
  const json = JSON.stringify(data, null, 2);
  await fs.writeFile(PROFILE_PATH, json, "utf-8");
}

export function groupSkillsByCategory(skills: Skill[]): Record<string, Skill[]> {
  const groups: Record<string, Skill[]> = {};
  for (const s of skills) {
    (groups[s.category] ??= []).push(s);
  }
  return groups;
}

export function descToArray(desc: string | string[]): string[] {
  if (Array.isArray(desc)) return desc;
  return [desc];
}