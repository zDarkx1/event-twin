import { ScenarioSimulator } from "@/components/scenario-simulator";
<<<<<<< HEAD
=======
import { decodeShareParams } from "@/lib/share-url";

/**
 * Halaman simulator. `searchParams` dibaca di server (F8) sehingga HTML yang
 * dikirim sudah memuat parameter dari tautan yang dibagikan — bukan nilai
 * default yang lalu diganti di klien.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(resolved)) {
    if (typeof value === "string") qs.set(key, value);
    // Kunci yang muncul dua kali (?p=1&p=2) diambil yang terakhir — konsisten
    // dengan perilaku URLSearchParams.get() pada string query biasa.
    else if (Array.isArray(value) && value.length > 0) qs.set(key, value[value.length - 1]);
  }
  const decoded = decodeShareParams(qs);
>>>>>>> 83336ac66993ce98b50edec30a5abff7f79e5fcc

  return (
    <div className="flex-1 bg-background">
      {/*
        96rem = 1536 px. `max-w-7xl` (1280 px) menyisakan gutter kosong lebar di
        layar 1920 px, dan kolom form yang menempel 22rem memakan sisanya
        sehingga empat kartu dampak terperas. Teks panjang tidak melebar ikut:
        paragraf pengantar sudah dibatasi sendiri.
      */}
      <div className="mx-auto grid max-w-[96rem] gap-4 px-4 py-6 sm:px-6 lg:py-8">
        <header className="grid gap-1">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            EventTwin
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Digital twin acara. Simulasikan sampah, energi, biaya, dan inklusi
            sebelum acara berlangsung — lalu bandingkan skenario
            penyelenggaraan.
          </p>
        </header>

<<<<<<< HEAD
        <ScenarioSimulator />
=======
        <ScenarioSimulator
          initial={{ scenario: decoded.scenario, baseline: decoded.baseline }}
        />
>>>>>>> 83336ac66993ce98b50edec30a5abff7f79e5fcc

        <footer className="pt-2 text-xs text-muted-foreground">
          Seluruh koefisien perhitungan bersumber dan terdokumentasi di{" "}
          <code className="font-mono">COEFFICIENTS.md</code>. Angka yang masih
          berstatus asumsi model disebut sebagai asumsi, bukan data.
        </footer>
      </div>
    </div>
  );
}
