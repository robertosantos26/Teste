# Hinos Jovens Atos do Espírito

Aplicação web para listar, criar e editar hinos (letra e cifra), com dados salvos no Supabase e leitura offline dos hinos já carregados.

## O que mudou nesta versão

- **Visual novo**: identidade de "cancioneiro" — verde floresta + dourado, tipografia serifada (Fraunces) para títulos e monoespaçada (IBM Plex Mono) para cifras.
- **Cifra e Tom**: cada hino agora pode ter um tom (ex: `G`, `Am`, `D`) e uma cifra própria, separada da letra.
- **Transpositor**: no modo Cifra, os botões `−` / `+` transpõem todos os acordes meio tom por vez, em tempo real, sem precisar editar ou salvar. Ideal para adaptar o tom na hora do ensaio.
- **Modo Apresentação**: tela cheia, fundo escuro, texto grande — pensado para ler no palco com pouca luz. Também permite transpor direto por ali.
- **Busca**: campo de busca filtra por título ou tom.
- **Favoritos**: toque na estrela para marcar hinos de uso frequente; ficam salvos neste aparelho e podem ser filtrados com o botão "★ Favoritos".

## Campos no Supabase

A tabela `hinos` deve ter, além dos campos já usados pelo app, os campos opcionais abaixo:

```sql
alter table hinos add column if not exists card_color text default '#ffffff';
alter table hinos add column if not exists category text default 'coral';
alter table hinos add column if not exists tom text default '';
alter table hinos add column if not exists cifra text default '';
```

- `card_color`: cor de cada card na lista.
- `category`: separa as músicas do Coral e da Banda. Necessário para que músicas criadas na aba **Banda** continuem aparecendo nela; registros antigos sem categoria aparecem em Coral.
- `tom`: tom original do hino (texto livre, ex: `G`, `Am`, `Bb`, `D`).
- `cifra`: letra com os acordes marcados entre colchetes (veja a seção abaixo). Independente do campo `lyrics`, que continua guardando a letra "limpa" (com cores e tamanho de fonte).

O app funciona mesmo se essas colunas ainda não existirem — ele detecta a ausência e simplesmente não tenta salvar aquele campo até a coluna ser criada.

## Como escrever uma cifra

No modo Editar, na aba **Cifra**, escreva a letra colocando cada acorde entre colchetes logo antes da sílaba onde ele deve tocar:

```
[G]Grande é o [D]Senhor
e mui digno de [Em7]louvor
[C]na cidade do nosso [G/B]Deus
```

Funciona com qualquer notação comum de cifra: `C`, `C#`, `Db`, `Am`, `G7`, `Fmaj7`, `Dsus4`, `F#m7b5`, acordes com baixo como `G/B`, etc. O app reconhece o padrão `[Nota + variação]` e transpõe tudo automaticamente quando você usa os botões de tom.

## Offline parcial (PWA)

- O app pode ser instalado na tela inicial (Android e iOS/Safari).
- Funciona offline para **abrir a interface** e **ler hinos (letra e cifra) já carregados anteriormente** no aparelho.
- Favoritos ficam salvos no aparelho e funcionam mesmo offline.
- Para criar ou salvar alterações no servidor, é necessária conexão com internet.

## Como testar offline parcial

1. Abra o app online e aguarde a lista de hinos carregar.
2. Feche e abra novamente para confirmar cache inicial.
3. Desative a internet.
4. Reabra o app: os hinos em cache devem aparecer com aviso de modo offline.

## Arquivos PWA

- `manifest.webmanifest`: metadados de instalação.
- `sw.js`: Service Worker e cache de assets.
- `icons/icon.svg`: ícone vetorial da instalação (compatível com diff em texto no Codex).

## Instalar no Android e iOS

- **Android (Chrome/Edge):** abra o app e toque em **Instalar app** quando o botão aparecer.
- **iOS (Safari):** toque em **Compartilhar** e depois em **Adicionar à Tela de Início**.
- Após instalar, o app abre em modo standalone e continua com suporte a offline parcial.
