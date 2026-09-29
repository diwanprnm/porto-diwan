// Test untuk fungsi murni di src/lib/pure.mjs.
//
// Dijalankan dengan runner bawaan Node: `npm test` → `node --test`.
//
// Sengaja TANPA argumen direktori: di Node 22 argumen posisional diperlakukan
// sebagai pola glob, bukan path — `node --test tests/` gagal dengan
// `Cannot find module '.../tests'`. Tanpa argumen, penemuan bawaan mencari
// `**/*.test.mjs` di seluruh repo (melewati node_modules).
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
  slugOf,
  withProjectSlugs,
  pickLocalized,
  pickLocalizedArray,
  pickLocalizedText,
  trimTrailingEmpty,
  looksLikeFile,
  swapLocalePath,
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
    // Halaman /[lang]/projects/[slug] bergantung pada ini untuk memanggil notFound().
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

  test("slug tetap dapat ditemukan dari nama Inggris walau terjemahan diisi", () => {
    // Invarian yang menjaga URL /projects/<slug> sama di kedua bahasa: slug
    // SELALU dari `name` (Inggris). Kalau suatu saat resolveProfileData mulai
    // mengganti `name` dengan terjemahan sebelum slug dihitung, project akan
    // 404 di halaman bahasa Indonesia — dan test ini yang menangkapnya.
    //
    // Di sini objeknya adalah baris MENTAH content/profile.json — belum lewat
    // withProjectSlugs, jadi belum punya `slug`. Justru itu yang diuji: slugOf
    // harus tetap bisa menurunkannya dari `name`, supaya seed dan pembacaan
    // langsung file tidak butuh perlakuan khusus.
    const data = JSON.parse(readFileSync(path.join(root, "content", "profile.json"), "utf-8"));

    for (const p of data.projects) {
      const slug = projectSlug(p.name);
      // findProjectBySlug bekerja lewat slugOf, yang jatuh ke `name` kalau
      // `slug` belum ada — jadi baris mentah pun harus ketemu.
      assert.equal(
        findProjectBySlug(data.projects, slug)?.name,
        p.name,
        `project "${p.name}" tidak ketemu lewat slug "${slug}"`
      );
    }
  });

  test("slug project SAMA di kedua bahasa walau namanya diterjemahkan", () => {
    // Ini bug yang pernah lolos: project yang `name_id`-nya bukan sekadar
    // terjemahan harfiah (mis. "Metagama Information System" →
    // "Sistem Informasi Metagama") menghasilkan slug BERBEDA kalau slug dihitung
    // dari nama yang sudah diterjemahkan. Akibatnya tautan project dari halaman
    // Indonesia 404 di halaman Inggris, dan `alternates.languages` menjanjikan
    // ke Google pasangan halaman yang tidak ada.
    //
    // Test ini gagal kalau slugOf memakai `name` alih-alih `slug`, atau kalau
    // withProjectSlugs dipanggil setelah terjemahan diterapkan.
    const data = JSON.parse(readFileSync(path.join(root, "content", "profile.json"), "utf-8"));

    // Slug yang benar, dihitung dari nama INGGRIS — inilah yang harus bertahan
    // di kedua bahasa.
    const expected = data.projects.map((p) => projectSlug(p.name));

    for (const lang of ["en", "id"]) {
      // Tirukan resolveProfileData: slug dulu, baru nama diterjemahkan.
      const resolved = withProjectSlugs(data.projects).map((p) => ({
        ...p,
        name: pickLocalized(p.name, p.name_id, lang),
      }));

      assert.deepEqual(
        resolved.map((p) => slugOf(p)),
        expected,
        `slug berubah di bahasa "${lang}"`
      );

      // Yang paling penting: tiap project harus ketemu lewat slugnya sendiri,
      // dari objek yang namanya sudah diterjemahkan.
      for (const p of resolved) {
        assert.equal(
          findProjectBySlug(resolved, slugOf(p))?.slug,
          slugOf(p),
          `project "${p.name}" tidak ketemu lewat slug "${slugOf(p)}"`
        );
      }
    }

    // Dan slug-nya harus identik lintas bahasa, bukan sekadar ketemu sendiri.
    const slugsPerLang = ["en", "id"].map((lang) =>
      withProjectSlugs(data.projects)
        .map((p) => ({ ...p, name: pickLocalized(p.name, p.name_id, lang) }))
        .map((p) => p.slug)
    );
    assert.deepEqual(
      slugsPerLang[0],
      slugsPerLang[1],
      "slug berbeda antara halaman Inggris dan Indonesia"
    );
  });

  test("findProjectBySlug tidak menemukan project lewat nama terjemahannya", () => {
    // Sisi lain dari invarian yang sama: slug Indonesia memang BUKAN alamat yang
    // sah. Kalau ini pernah benar, berarti slug-nya ikut diterjemahkan.
    //
    // Perhatikan pemilihannya: TIDAK semua terjemahan menghasilkan slug berbeda.
    // "Diarvis — Manajemen Aset Regional" tetap jadi "diarvis" karena projectSlug
    // memotong bagian setelah em-dash — jadi slug terjemahannya kebetulan sama
    // dan project-nya ketemu. Yang benar-benar membuktikan invarian ini adalah
    // project yang slug terjemahannya BERBEDA, seperti "Metagama Information
    // System" → "Sistem Informasi Metagama".
    const data = JSON.parse(readFileSync(path.join(root, "content", "profile.json"), "utf-8"));
    const resolved = withProjectSlugs(data.projects).map((p) => ({
      ...p,
      name: pickLocalized(p.name, p.name_id, "id"),
    }));

    const p = resolved.find(
      (x) => x.name_id && projectSlug(x.name_id) !== x.slug
    );
    assert.ok(
      p,
      "seed harus punya minimal satu project yang slug terjemahannya berbeda"
    );

    assert.equal(
      findProjectBySlug(resolved, projectSlug(p.name_id)),
      undefined,
      `slug dari nama terjemahan "${p.name_id}" seharusnya tidak sah`
    );
  });

  test("setiap field prosa punya terjemahan Indonesia", () => {
    // Bukan soal kelengkapan demi kelengkapan: field yang lupa diterjemahkan
    // akan tampil berbahasa Inggris di tengah halaman Indonesia, dan itu tidak
    // pernah muncul sebagai error — hanya terasa janggal.
    const data = JSON.parse(readFileSync(path.join(root, "content", "profile.json"), "utf-8"));
    const missing = [];

    if (!data.profile?.title_id) missing.push("profile.title_id");
    if (!data.profile?.bio_id) missing.push("profile.bio_id");
    if (!data.profile?.about_id) missing.push("profile.about_id");
    if (!data.education?.degree_id) missing.push("education.degree_id");

    (data.experience ?? []).forEach((e, i) => {
      if (!e.period_id) missing.push(`experience[${i}].period_id`);
      if (!e.title_id) missing.push(`experience[${i}].title_id`);
      if (!e.highlights_id?.length) missing.push(`experience[${i}].highlights_id`);
    });

    (data.projects ?? []).forEach((p, i) => {
      if (!p.name_id) missing.push(`projects[${i}].name_id`);
      if (!p.client_id) missing.push(`projects[${i}].client_id`);
      if (!p.description_id) missing.push(`projects[${i}].description_id`);
    });

    assert.deepEqual(missing, [], `belum diterjemahkan: ${missing.join(", ")}`);
  });
});

describe("pickLocalized", () => {
  test("bahasa Inggris memakai nilai Inggris walau terjemahan ada", () => {
    assert.equal(pickLocalized("Hello", "Halo", "en"), "Hello");
  });

  test("bahasa Indonesia memakai terjemahan kalau ada isinya", () => {
    assert.equal(pickLocalized("Hello", "Halo", "id"), "Halo");
  });

  test("terjemahan kosong jatuh ke Inggris", () => {
    // Titik batas yang paling penting: ini yang membuat terjemahan bisa diisi
    // bertahap. Bidang kosong harus menampilkan Inggris, bukan bidang kosong.
    assert.equal(pickLocalized("Hello", "", "id"), "Hello");
    assert.equal(pickLocalized("Hello", undefined, "id"), "Hello");
    assert.equal(pickLocalized("Hello", null, "id"), "Hello");
  });

  test("terjemahan berisi spasi saja dianggap belum diterjemahkan", () => {
    // Kolom teks yang dibiarkan kosong di admin menghasilkan " " atau "\n",
    // bukan "". Kalau ini lolos, halaman Indonesia menampilkan bidang kosong.
    assert.equal(pickLocalized("Hello", "   ", "id"), "Hello");
    assert.equal(pickLocalized("Hello", "\n\t ", "id"), "Hello");
  });

  test("nilai Inggris yang tidak ada jadi string kosong, bukan undefined", () => {
    // Pemanggil menaruh hasilnya langsung ke JSX; undefined bikin React
    // mengeluh soal uncontrolled input.
    assert.equal(pickLocalized(undefined, undefined, "en"), "");
    assert.equal(pickLocalized(null, "Halo", "en"), "");
  });
});

describe("pickLocalizedArray", () => {
  test("bahasa Indonesia memakai array terjemahan", () => {
    assert.deepEqual(pickLocalizedArray(["a", "b"], ["x", "y"], "id"), ["x", "y"]);
  });

  test("array terjemahan yang isinya kosong semua jatuh ke Inggris", () => {
    assert.deepEqual(pickLocalizedArray(["a", "b"], ["", ""], "id"), ["a", "b"]);
    assert.deepEqual(pickLocalizedArray(["a", "b"], [], "id"), ["a", "b"]);
  });

  test("elemen kosong di tengah dibuang, bukan meninggalkan lubang", () => {
    // Dua bahasa dengan jumlah paragraf berbeda berbagi baris yang sama di
    // tabel project_descriptions, jadi sisi yang lebih pendek diisi "" di
    // belakang. Yang kosong tidak boleh ter-render sebagai jarak menganga.
    assert.deepEqual(pickLocalizedArray(["a"], ["x", "", "z"], "id"), ["x", "z"]);
  });

  test("panjang berbeda antar bahasa bukan masalah", () => {
    assert.deepEqual(
      pickLocalizedArray(["only one"], ["satu", "dua", "tiga"], "id"),
      ["satu", "dua", "tiga"]
    );
  });

  test("tidak ada terjemahan sama sekali jatuh ke Inggris", () => {
    assert.deepEqual(pickLocalizedArray(["a"], undefined, "id"), ["a"]);
    assert.deepEqual(pickLocalizedArray(["a"], null, "en"), ["a"]);
  });
});

describe("pickLocalizedText", () => {
  test("string tunggal diperlakukan sebagai string", () => {
    // Deskripsi project boleh string tunggal (Metagama) atau array (lainnya).
    // Kalau bentuk string tidak ditangani, deskripsinya hilang.
    assert.equal(pickLocalizedText("Hello", "Halo", "id"), "Halo");
    assert.equal(pickLocalizedText("Hello", "", "id"), "Hello");
  });

  test("array tetap array", () => {
    assert.deepEqual(pickLocalizedText(["a"], ["x", "y"], "id"), ["x", "y"]);
  });

  test("satu sisi string, sisi lain array — hasilnya array", () => {
    // Ini bentuk yang benar-benar bisa terjadi: Inggris string tunggal,
    // terjemahannya dipecah jadi dua paragraf.
    assert.deepEqual(pickLocalizedText("solo", ["x", "y"], "id"), ["x", "y"]);
  });

  test("terjemahan array kosong jatuh ke string Inggris", () => {
    assert.deepEqual(pickLocalizedText("solo", [], "id"), ["solo"]);
  });
});

describe("trimTrailingEmpty", () => {
  test("membuang ekor kosong", () => {
    assert.deepEqual(trimTrailingEmpty(["a", "b", "", ""]), ["a", "b"]);
  });

  test("elemen kosong di tengah DIPERTAHANKAN", () => {
    // Paragraf kosong di tengah adalah paragraf yang memang diketik pengguna.
    // Membuangnya menggeser paragraf sesudahnya ke posisi yang salah.
    assert.deepEqual(trimTrailingEmpty(["a", "", "b"]), ["a", "", "b"]);
  });

  test("array kosong dan non-array aman", () => {
    assert.deepEqual(trimTrailingEmpty([]), []);
    assert.deepEqual(trimTrailingEmpty(undefined), []);
    assert.deepEqual(trimTrailingEmpty(null), []);
  });
});

describe("looksLikeFile", () => {
  test("beranda TIDAK dianggap file", () => {
    // Titik batas paling penting di sini. Segmen terakhir "/" adalah string
    // KOSONG, bukan "/". Implementasi yang memeriksa pathname utuh, atau yang
    // mengambil segmen dengan cara lain, bisa menganggap beranda sebagai file —
    // dan begitu itu terjadi, "/" tidak lagi di-redirect ke /en, melainkan
    // dibiarkan lewat dan seluruh situs berhenti bekerja.
    assert.equal(looksLikeFile("/"), false);
    assert.equal(looksLikeFile(""), false);
  });

  test("aset di public/ dianggap file", () => {
    // Inilah yang sebenarnya diperbaiki: foto profil dan ikon social disajikan
    // apa adanya di path-nya. Tanpa ini, "/image/diwan2.png" di-redirect ke
    // "/en/image/diwan2.png" lalu 404.
    assert.equal(looksLikeFile("/image/diwan2.png"), true);
    assert.equal(looksLikeFile("/image/github.png"), true);
    assert.equal(looksLikeFile("/favicon.ico"), true);
  });

  test("rute halaman TIDAK dianggap file", () => {
    assert.equal(looksLikeFile("/en"), false);
    assert.equal(looksLikeFile("/id/projects/diarvis"), false);
    // Slug project hanya berisi [a-z0-9] dan tanda hubung (lihat projectSlug),
    // jadi tidak pernah ada halaman yang salah dianggap file.
    assert.equal(looksLikeFile("/en/projects/metagama-information-system"), false);
    assert.equal(looksLikeFile("/api/images/12"), false);
  });

  test("garis miring di ujung tidak menghasilkan false positive", () => {
    // "/image/" segmen terakhirnya kosong — bukan file.
    assert.equal(looksLikeFile("/image/"), false);
  });

  test("titik di TENGAH path bukan penanda file", () => {
    // Yang menentukan hanya segmen TERAKHIR. Kalau pemeriksaannya memakai
    // pathname utuh, "/projects/v1.2/diarvis" akan salah dianggap file.
    assert.equal(looksLikeFile("/projects/v1.2/diarvis"), false);
  });
});

describe("swapLocalePath", () => {
  const LOCALES = ["en", "id"];

  test("menukar prefiks dan mempertahankan sisa path", () => {
    // Inti fiturnya: dari halaman detail project, pindah bahasa harus tetap di
    // halaman itu, bukan dilempar ke beranda.
    assert.equal(swapLocalePath("/en/projects/diarvis", "id", LOCALES), "/id/projects/diarvis");
    assert.equal(swapLocalePath("/id/projects/diarvis", "en", LOCALES), "/en/projects/diarvis");
  });

  test("path tanpa segmen sesudahnya tidak dapat garis miring di ujung", () => {
    assert.equal(swapLocalePath("/en", "id", LOCALES), "/id");
    assert.equal(swapLocalePath("/id", "en", LOCALES), "/en");
  });

  test("path tanpa prefiks locale ditambahi, bukan dipotong", () => {
    // Kalau salah di sini, segmen pertama path hilang tanpa error apa pun.
    assert.equal(swapLocalePath("/projects/diarvis", "id", LOCALES), "/id/projects/diarvis");
    assert.equal(swapLocalePath("/", "id", LOCALES), "/id");
  });

  test("segmen yang kebetulan sama dengan kode bahasa tidak salah dikenali", () => {
    // "/projects/en" — "en" di sini adalah slug, bukan prefiks locale.
    assert.equal(swapLocalePath("/id/projects/en", "en", LOCALES), "/en/projects/en");
  });
});
