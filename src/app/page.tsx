import { ScenarioSimulator } from "@/components/scenario-simulator";

export default function Home() {
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

        <ScenarioSimulator />

        <footer className="pt-2 text-xs text-muted-foreground">
          Seluruh koefisien perhitungan bersumber dan terdokumentasi di{" "}
          <code className="font-mono">COEFFICIENTS.md</code>. Angka yang masih
          berstatus asumsi model disebut sebagai asumsi, bukan data.
        </footer>
      </div>
    </div>
  );
}
