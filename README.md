# 🎸 Garden Tuner & Metronome

> **Chromatic Strobe Tuner & High-Precision Stage Metronome.**
> Afinador cromático estroboscópico de alta precisão com detecção DSP de pitch baseada no algoritmo YIN (Web Audio API), calibração A4 customizável, metrônomo lookahead sem drift de timer e flash de palco para uso ao vivo e em estúdio.

Parte da **Garden Suite** — ferramentas de código aberto de nível Senior/Staff, 100% gratuitas, offline-first e sem dependência de nuvem.

---

## ✨ Recursos

### 🎛️ Afinador Cromático Strobe (YIN DSP)
- 🎯 **Algoritmo YIN Canônico**: Detecção de frequência fundamental no domínio do tempo com função de diferença normalizada cumulativa e interpolação parabólica. Imunidade a erros de oitava.
- 🎡 **Roda Estroboscópica em Tempo Real**: Rotação visual a 60 FPS proporcional ao desvio em cents. Gira no sentido anti-horário quando bemol, horário quando sustenido, e para completamente quando perfeitamente afinado.
- 🎚️ **Medidor de Cents (-50 a +50)**: Indicador visual com graduação de cor (âmbar/vermelho para desvio, verde esmeralda para afinação dentro da margem de ±3 cents).
- 🎼 **Calibração A4 Flexível**: Suporta afinação padrão (440 Hz), afinação Verdi (432 Hz), orquestral (442 Hz) e moderna (444 Hz).
- 🎸 **Presets de Instrumentos & Tons de Referência**:
  - Guitarra / Violão Standard (EADGBE), Drop D (DADGBE), Drop C (CGCFAD), Open G (DGDGBD) e DADGAD (Folk / Celta)
  - Baixo 4 Cordas (EADG) e Baixo 5 Cordas (BEADG)
  - Ukulele Soprano (GCEA)
  - Cromático Geral e Tunings Customizados com persistência local
  - Síntese de tom acústico de referência com harmônicos naturais ao clicar em cada corda para afinação de ouvido.

### ⏱️ Metrônomo de Palco (Web Audio Lookahead)
- ⏳ **Lookahead Scheduling**: Elimina drift de timing típico de `setInterval` do JavaScript, agendando osciladores diretamente no clock de hardware de áudio do sistema.
- 👆 **Tap Tempo**: Calcula o BPM médio instantaneamente a partir dos seus toques na tela ou mouse.
- 🥁 **Assinaturas Rítmicas**: 2/4, 3/4, 4/4 e 6/8 com acentuação diferenciada no primeiro tempo (High Beep 1200Hz vs 800Hz).
- 💡 **Flash Visual de Palco (Silent / Stage Mode)**: Flash síncrono na tela em tempo real, perfeito para palcos barulhentos onde o clique de áudio não pode ser ouvido ou para apresentações silenciosas.

### 📱 Portabilidade Web + APK Android Automático
- 🌐 **Deploy no GitHub Pages**: Executável diretamente pelo navegador em qualquer dispositivo: [https://felipegardenghidev.github.io/garden-tuner/](https://felipegardenghidev.github.io/garden-tuner/)
- 📱 **Compilação Contínua de APK Android**: A cada commit na branch `main`, o GitHub Actions compila o APK nativo (`garden-tuner-debug-apk`) disponível para download imediato na aba **Actions**.
- 100% Client-Side: zero envio de áudio para servidores, privacidade total e resposta em microssegundos.

---

## 🛠️ Stack Tecnológica

- **Frontend**: React 19 + TypeScript
- **Estilização**: Tailwind CSS v4 + Lucide Icons
- **DSP Audio Core**: Web Audio API (`AudioContext`, `AnalyserNode`, YIN Difference Function)
- **Mobile Engine**: Capacitor 8 (Android)
- **Testes & CI**: Vitest + GitHub Actions

---

## 🚀 Como Executar

### 1. Requisitos
- Node.js 20+
- npm 10+

### 2. Instalação e Desenvolvimento Web
```bash
git clone https://github.com/FelipeGardenghiDev/garden-tuner.git
cd garden-tuner
npm install
npm run dev
```

### 3. Testes Unitários
```bash
npm test
```

### 4. Build para Produção
```bash
npm run build
```

### 5. Executar no Android (APK / Emulador)
```bash
npm run mobile:sync
npm run mobile:open # Abre o projeto no Android Studio
```

---

## 📜 Licença

MIT License © 2026 Felipe Gardenghi. Feito por músicos para músicos.
