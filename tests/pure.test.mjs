// Test untuk fungsi murni di src/lib/pure.mjs.
//
// Dijalankan dengan runner bawaan Node: `npm test` → `node --test tests/`.
// Tidak ada framework test yang dipasang, dan itu disengaja — lihat catatan di
// src/lib/pure.mjs soal kenapa .mjs.
//
// Prinsip yang dipegang di sini sama dengan study case CI/CD: yang menentukan
// bergunanya sebuah test bukan jumlahnya, tapi apakah ia benar-benar bisa GAGAL.
// Karena itu yang diuji di bawah adalah titik batas — nama dengan em-dash, nama
// yang seluruhnya tanda baca, dua project yang slug-nya bertabrakan — bukan
// kasus yang jelas-jelas benar.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  projectSlug,
  descToArray,
  groupSkillsByCategory,
  findProjectBySlug,
} from "../src/lib/pure.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("projectSlug", () => {
  test("membuang bagian setelah em-dash", () => {
    // Ini titik batasnya: nama project di content/profile.json memakai pola
    // "<Nama> — <Keterangan>", dan URL detail harus "diarvis", bukan
    // "diarvis-regional-asset-management".
    assert.equal(projectSlug("Diarvis — Regional Asset Management"), "diarvis");
  });

  test("em-dash tanpa spasi di sekitarnya tetap memotong", () => {
    assert.equal(projectSlug("Foo—Bar"), "foo");
  });

  test("huruf kecil dan spasi jadi tanda hubung", () => {
    assert.equal(projectSlug("Sistem Manajemen Aset"), "sistem-manajemen-aset");
  });

  test("tanda baca beruntun jadi SATU tanda hubung, bukan beberapa", () => {
    // Kalau `+` hilang dari regex, hasilnya "a---b" dan URL-nya tidak akan
    // pernah cocok dengan apa yang diharapkan.
    assert.equal(projectSlug("A - - - B"), "a-b");
  });

  test("tanda hubung di ujung dibuang", () => {
    assert.equal(projectSlug("  !Hello World!  "), "hello-world");
  });

  test("angka dipertahankan", () => {
    assert.equal(projectSlug("Sistem 2024"), "sistem-2024");
  });

  test("nama yang seluruhnya tanda baca menghasilkan string kosong", () => {
    // Bukan nilai yang enak dipakai, tapi harus DIDEKATI dengan sengaja: yang
    // tidak boleh terjadi adalah fungsi ini melempar, karena ia dipanggil saat
    // merender halaman dan saat seed.
    assert.equal(projectSlug("!!!"), "");
  });

  test("string kosong tidak melempar", () => {
    assert.equal(projectSlug(""), "");
  });
});

describe("descToArray", () => {
  test("string tunggal dibungkus jadi array satu elemen", () => {
    // Project "Metagama" di seed berbentuk string, bukan array. Kalau bentuk ini
    // tidak ditangani, textarea di admin muncul kosong dan deskripsinya hilang.
    assert.deepEqual(descToArray("satu paragraf"), ["satu paragraf"]);
  });

  test("array dikembalikan apa adanya", () => {
    assert.deepEqual(descToArray(["a", "b"]), ["a", "b"]);
  });

  test("array kosong tetap array kosong", () => {
    assert.deepEqual(descToArray([]), []);
  });

  test("string kosong jadi array berisi satu string kosong", () => {
    // Bukan [] — dan itu penting: pemanggil yang membedakan keduanya (mis.
    // `descToArray(x)[0]` untuk teaser) akan mendapat undefined kalau di sini
    // dikembalikan [].
    assert.deepEqual(descToArray(""), [""]);
  });
});

describe("groupSkillsByCategory", () => {
  test("mengelompokkan dan mempertahankan urutan asli", () => {
    const skills = [
      { name: "JavaScript", category: "language" },
      { name: "Next.js", category: "framework" },
      { name: "TypeScript", category: "language" },
    ];
    const groups = groupSkillsByCategory(skills);

    assert.deepEqual(Object.keys(groups), ["language", "framework"]);
    assert.deepEqual(
      groups.language.map((s) => s.name),
      ["JavaScript", "TypeScript"]
    );
    assert.deepEqual(groups.framework.map((s) => s.name), ["Next.js"]);
  });

  test("daftar kosong menghasilkan objek kosong", () => {
    assert.deepEqual(groupSkillsByCategory([]), {});
  });

  test("kategori tidak dikenal tetap dibuatkan kelompoknya", () => {
    const groups = groupSkillsByCategory([{ name: "Docker", category: "devops" }]);
    assert.deepEqual(groups.devops, [{ name: "Docker", category: "devops" }]);
  });
});

describe("findProjectBySlug", () => {
  const projects = [
    { name: "Metagama" },
    { name: "Diarvis — Regional Asset Management" },
  ];

  test("menemukan project lewat slug yang dihitung dari namanya", () => {
    assert.equal(findProjectBySlug(projects, "diarvis")?.name, "Diarvis — Regional Asset Management");
  });

  test("slug yang tidak ada menghasilkan undefined, bukan melempar", () => {
    // Halaman /projects/[slug] bergantung pada ini untuk memanggil notFound().
    assert.equal(findProjectBySlug(projects, "tidak-ada"), undefined);
  });

  test("nama lengkap bukan slug yang sah", () => {
    assert.equal(findProjectBySlug(projects, "Diarvis — Regional Asset Management"), undefined);
  });
});

describe("data seed", () => {
  test("setiap project di content/profile.json punya slug yang unik", () => {
    // Test ini menangkap bug yang tidak akan terlihat sebagai error di mana pun:
    // `saveProfileData` dan seed memakai slug sebagai kunci (`ON CONFLICT (slug)`),
    // jadi dua project yang slug-nya bertabrakan akan saling menimpa secara
    // diam-diam — satu project hilang dari situs tanpa pesan apa pun.
    const data = JSON.parse(readFileSync(path.join(root, "content", "profile.json"), "utf-8"));
    const slugs = data.projects.map((p) => projectSlug(p.name));

    for (const p of data.projects) {
      assert.notEqual(
        projectSlug(p.name),
        "",
        `slug kosong untuk project "${p.name}"`
      );
    }

    const unik = new Set(slugs);
    assert.equal(
      unik.size,
      slugs.length,
      `slug bertabrakan: ${slugs.filter((s, i) => slugs.indexOf(s) !== i).join(", ")}`
    );
  });

  test("setiap project punya nama", () => {
    const data = JSON.parse(readFileSync(path.join(root, "content", "profile.json"), "utf-8"));
    for (const p of data.projects) {
      assert.equal(typeof p.name, "string");
      assert.ok(p.name.trim().length > 0);
    }
  });
});
