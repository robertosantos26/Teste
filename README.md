# Hinos Jovens Atos do Espírito

Aplicação web para listar, criar e editar hinos (letra e cifra), com dados salvos no Supabase e leitura offline dos hinos já carregados.

## O que mudou nesta versão

- **Página inicial nova**: antes de entrar nas listas de hinos, o app abre numa tela com o repertório do dia e dois atalhos grandes para Coral e Banda.
- **Repertório do dia**: qualquer pessoa pode montar a lista de hinos que serão tocados hoje. Ao criar, o app pede a senha e o nome de quem está montando; esse nome aparece para todo mundo que abrir o app. Quem acessa fica vendo o repertório atualizado enquanto estiver online; se ficar offline, continua vendo o último repertório que já havia carregado neste aparelho.
- **Navegação por página**: início, lista (Coral/Banda) e hino agora têm URLs próprias (`#/`, `#/lista/coral`, `#/hino/123`), então o botão "voltar" do celular/navegador funciona corretamente entre as telas.
- **Cifra mais robusta**: o acorde agora fica preso exatamente acima da sílaba onde troca (tanto no computador quanto no celular), mesmo quando a linha quebra em telas estreitas — isso foi reescrito para não depender de recursos de renderização inconsistentes entre navegadores.
- **Visual mais leve**: paleta em verde-sálvia mais suave (em vez do verde escuro saturado anterior), cards com mais respiro e sombras mais discretas.
- **Transpositor**: no modo Cifra, os botões `−` / `+` transpõem todos os acordes meio tom por vez, em tempo real, sem precisar editar ou salvar.
- **Modo Apresentação**: tela cheia, fundo escuro, texto grande — pensado para ler no palco com pouca luz.
- **Busca e Favoritos**: campo de busca por título/tom e estrela de favoritos, salvos neste aparelho.

## Configuração no Supabase

### Tabela `hinos`

Além dos campos já usados pelo app, os campos opcionais abaixo:

```sql
alter table hinos add column if not exists card_color text default '#ffffff';
alter table hinos add column if not exists category text default 'coral';
alter table hinos add column if not exists tom text default '';
alter table hinos add column if not exists cifra text default '';
```

Se você só precisa habilitar a cifra para Coral e Banda em uma instalação existente, também pode executar o script completo em [`sql/adicionar-cifra-hinos.sql`](sql/adicionar-cifra-hinos.sql).

- `card_color`: cor de cada card na lista.
- `category`: separa as músicas do Coral e da Banda.
- `tom`: tom original do hino (texto livre, ex: `G`, `Am`, `Bb`, `D`).
- `cifra`: letra com os acordes marcados entre colchetes. Independente do campo `lyrics`.

O app funciona mesmo se essas colunas ainda não existirem — ele detecta a ausência e simplesmente não tenta salvar aquele campo até a coluna ser criada.

### Tabela `repertorios` (repertório do dia)

Execute o script [`sql/criar-repertorio.sql`](sql/criar-repertorio.sql) no editor SQL do Supabase para criar a tabela usada pelo repertório do dia. Se essa tabela ainda não existir, o app avisa na tela inicial e continua funcionando normalmente para o resto das funções.

- `data`: data do repertório (uma linha por dia; editar refaz o mesmo dia).
- `criado_por`: nome de quem montou.
- `hino_ids`: lista ordenada dos ids dos hinos escolhidos.

## Como escrever uma cifra

No modo Editar, na aba **Cifra**, escreva a letra colocando cada acorde entre colchetes logo antes da sílaba onde ele deve tocar:

```
[G]Grande é o [D]Senhor
e mui digno de [Em7]louvor
[C]na cidade do nosso [G/B]Deus
```

Funciona com qualquer notação comum de cifra: `C`, `C#`, `Db`, `Am`, `G7`, `Fmaj7`, `Dsus4`, `F#m7b5`, acordes com baixo como `G/B`, etc. O app reconhece o padrão `[Nota + variação]` e transpõe tudo automaticamente quando você usa os botões de tom. Ao exibir (fora do modo edição), o acorde aparece grudado exatamente acima da sílaba onde ele muda, tanto no computador quanto no celular.

## Offline parcial (PWA)

- O app pode ser instalado na tela inicial (Android e iOS/Safari).
- Funciona offline para **abrir a interface** e **ler hinos (letra e cifra) já carregados anteriormente** no aparelho.
- O **repertório do dia** também fica disponível offline, mostrando o último carregado com um aviso.
- Favoritos ficam salvos no aparelho e funcionam mesmo offline.
- Para criar/editar hinos, transferir a criação/edição do repertório ou salvar alterações no servidor, é necessária conexão com internet.

## Como testar offline parcial

1. Abra o app online e aguarde a lista de hinos e o repertório do dia carregarem.
2. Feche e abra novamente para confirmar cache inicial.
3. Desative a internet.
4. Reabra o app: os hinos e o repertório em cache devem aparecer com aviso de modo offline.

## Arquivos PWA

- `manifest.webmanifest`: metadados de instalação.
- `sw.js`: Service Worker e cache de assets.
- `icons/icon.svg`: ícone vetorial da instalação (compatível com diff em texto no Codex).

## Instalar no Android e iOS

- **Android (Chrome/Edge):** abra o app e toque em **Instalar app** quando o botão aparecer.
- **iOS (Safari):** toque em **Compartilhar** e depois em **Adicionar à Tela de Início**.
- Após instalar, o app abre em modo standalone e continua com suporte a offline parcial.
