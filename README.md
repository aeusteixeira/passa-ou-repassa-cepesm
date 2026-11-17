# Passa ou Repassa da Consciência Negra

Jogo de Passa ou Repassa para duas equipes, com 30 perguntas sobre história, cultura e personalidades negras. Feito para o Dia da Consciência Negra (20 de novembro) do CEPESM, Colégio Estadual Professora Evangelina Soares de Moura.

**Jogar:** https://aeusteixeira.github.io/passa-ou-repassa-cepesm/

## Como usar

Abra a página no projetor e use a máquina de botões para a disputa. O apresentador marca na tela qual equipe apertou primeiro e qual alternativa ela escolheu. A página mostra a resposta certa, toca a explicação e soma os pontos. As regras e as teclas de atalho estão em [LEIA-ME.txt](LEIA-ME.txt).

Também funciona sem internet: baixe o repositório e abra o `index.html`.

## Arquivos

- `index.html`: o jogo inteiro, com as perguntas.
- `logo.png`: brasão do colégio.
- `audio/`: narração das perguntas e respostas (`pergunta-01.mp3`, `resposta-01.mp3`...). O texto de cada áudio está em `audio/roteiro-audios.csv`. Sem o arquivo, a página lê com a voz do navegador.
- `ferramentas/gerar-audios.js`: gera os áudios no ElevenLabs a partir do roteiro.
