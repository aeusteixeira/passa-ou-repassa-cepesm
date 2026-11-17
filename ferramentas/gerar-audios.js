// Gera os áudios do jogo no ElevenLabs com a voz "Apresentador CEPESM (Passa ou Repassa)".
// Lê o texto de audio/roteiro-audios.csv e grava audio/pergunta-NN.mp3 e audio/resposta-NN.mp3.
// Pula os arquivos que já existem e para sozinho quando o saldo de caracteres acaba.
// Uso: node ferramentas/gerar-audios.js [perguntas|respostas|tudo]
const fs = require("fs");
const path = require("path");

const ENV = "D:/Projetos/Pessoais/HP/hogwarts-resiste/.env";
const VOICE_ID = "MMH4SMghm3gqJ3yJmsDQ";
const ROOT = path.join(__dirname, "..");
const AUDIO = path.join(ROOT, "audio");
const only = process.argv[2] || "tudo";

const env = Object.fromEntries(
  fs.readFileSync(ENV, "utf8").split(/\r?\n/).filter((l) => /^\s*[A-Z_]+\s*=/.test(l))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const H = { "xi-api-key": env.ELEVENLABS_API_KEY, "Content-Type": "application/json" };
const MODEL = env.ELEVENLABS_MODEL || "eleven_multilingual_v2";

const rows = fs.readFileSync(path.join(AUDIO, "roteiro-audios.csv"), "utf8").replace(/^\ufeff/, "")
  .split(/\r?\n/).slice(1).filter(Boolean)
  .map((l) => { const i = l.indexOf(";"); return { file: l.slice(0, i), text: l.slice(i + 2, -1).replace(/""/g, '"') }; })
  .filter((r) => only === "tudo" || r.file.startsWith(only === "perguntas" ? "pergunta" : "resposta"));

async function saldo() {
  const s = await fetch("https://api.elevenlabs.io/v1/user/subscription", { headers: H }).then((r) => r.json());
  return s.character_limit - s.character_count;
}

(async () => {
  let left = await saldo();
  console.log("Saldo inicial:", left, "caracteres | modelo:", MODEL);
  let feitos = 0;
  for (const r of rows) {
    const out = path.join(AUDIO, r.file);
    if (fs.existsSync(out)) continue;
    if (r.text.length > left) { console.log("Saldo acabou antes de " + r.file + ". Faltam " + r.text.length + ", restam " + left + "."); break; }
    const res = await fetch("https://api.elevenlabs.io/v1/text-to-speech/" + VOICE_ID + "?output_format=mp3_44100_128", {
      method: "POST",
      headers: H,
      body: JSON.stringify({ text: r.text, model_id: MODEL, language_code: "pt", voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.3 } }),
    });
    if (!res.ok) { console.log("Erro em " + r.file + ":", res.status, (await res.text()).slice(0, 300)); break; }
    fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
    left -= r.text.length;
    feitos++;
    console.log("ok", r.file);
  }
  console.log("Gerados agora:", feitos, "| saldo restante:", await saldo());
})();
