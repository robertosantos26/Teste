# Hinos Jovens Atos do Espírito

Aplicação web simples para listar, criar e editar hinos com dados salvos no Supabase.

## Offline parcial (PWA)

- O app pode ser instalado na tela inicial (Android e iOS/Safari).
- Funciona offline para **abrir a interface** e **ler hinos já carregados anteriormente** no aparelho.
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
