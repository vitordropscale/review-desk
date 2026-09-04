# Review Desk — setup

Painel para controlar os reviews 1–3★ do Trustpilot (Lumvelle, Old Harvest e o que mais entrar). Site estático (`index.html`) + banco de dados numa Google Sheet, lida e escrita por um Apps Script (`Code.gs`) — o mesmo padrão do contador de e-mails, só que hospedado no GitHub Pages em vez do Netlify.

A resolução em si (conversa com o cliente, refund etc.) continua acontecendo no Richpanel e no próprio Trustpilot. Este painel é só o controle: status, responsável, links e notas.

## 1. Criar a planilha e o backend

1. Crie uma Google Sheet nova (pode ficar em branco — a aba `Reviews` é criada sozinha na primeira chamada).
2. Menu **Extensões > Apps Script**.
3. Apague o conteúdo de `Code.gs` que abrir por padrão e cole o conteúdo do arquivo `Code.gs` desta entrega.
4. No topo do script, troque:
   ```js
   const SHARED_SECRET = 'troque-esta-senha';
   ```
   por uma senha sua (qualquer texto, sem espaços). Guarde essa senha — ela vai se repetir no `index.html`.
5. **Implantar > Nova implantação**.
   - Tipo: **App da Web**.
   - Executar como: **Eu** (sua conta).
   - Quem tem acesso: **Qualquer pessoa**.
6. O Google vai pedir autorização (é o script acessando a sua própria planilha) — aceite.
7. Copie a **URL do app da Web** gerada (termina em `/exec`). É ela que vai no `index.html`.

> Sempre que você editar o `Code.gs` depois, é preciso publicar de novo: **Gerenciar implantações > ícone de editar > Nova versão > Implantar**. Só salvar o arquivo não é suficiente.

## 2. Configurar o site

Abra `index.html` num editor de texto e troque, perto do topo do `<script>`:

```js
var CONFIG = {
  API_URL: "COLE_AQUI_A_URL_DO_SEU_APPS_SCRIPT",
  SHARED_SECRET: "troque-esta-senha",
  SLA_HOURS: 24,
  STORES: ["Lumvelle", "Old Harvest"],
  POLL_MS: 30000
};
```

- `API_URL`: a URL que você copiou no passo anterior.
- `SHARED_SECRET`: **a mesma senha** que você colocou no `Code.gs`.
- `STORES`: lista de lojas que aparecem nos filtros e no formulário de adicionar. Pra incluir uma loja nova, é só adicionar o nome aqui.
- `SLA_HOURS`: o prazo interno (hoje 24h) que dispara o aviso "passou do SLA".

## 3. Subir no GitHub Pages

1. Crie um repositório novo.
2. Suba os dois arquivos `index.html` e `Code.gs` na raiz (o `Code.gs` fica só de referência/histórico — quem roda de verdade é a cópia que está no Apps Script).
3. **Settings > Pages** → Source: `Deploy from a branch` → Branch: `main` / pasta `/ (root)` → Save.
4. Em alguns minutos o GitHub mostra o link (algo como `https://seu-usuario.github.io/nome-do-repo/`). É esse link que a equipe usa no dia a dia.

### Repositório privado x público — o que isso muda de verdade

No plano **Free** do GitHub (o padrão de conta pessoal), o Pages só funciona em repositório **público** — se o repositório for privado, a opção de publicar nem aparece em Settings > Pages. Pra manter o repositório privado e ainda assim usar Pages, precisa do plano **Pro** (pago, uns US$4/mês). Então, a não ser que vocês já tenham ou queiram esse plano, o repositório precisa ficar **público**.

E mesmo que fosse privado (com Pro), a página publicada no GitHub Pages fica pública por padrão de qualquer forma — repositório e site são coisas separadas, e site restrito de verdade (só quem tem permissão no repo abre) exige GitHub Enterprise Cloud, o que não faz sentido só por causa deste painel.

Como o repositório vai ficar público, **o código-fonte (com a URL do Apps Script) fica visível pra qualquer um**. Por isso o `Code.gs` desta entrega exige a senha (`SHARED_SECRET`) tanto pra ler quanto pra escrever na planilha — sem isso, bastaria alguém achar a URL pra ver todos os reviews, sem precisar de senha nenhuma. Ainda assim, use um nome de repositório que não entregue o que é ("review-desk" é razoavelmente neutro) e não divulgue o link do site fora da equipe. O login por e-mail/senha do painel (abaixo) é uma camada a mais, não a proteção principal — a proteção real aqui é a senha compartilhada no `Code.gs`/`index.html`.

Se um dia vocês quiserem manter o repositório privado e ainda usar Pages, o caminho é o plano Pro. Se quiserem site com login de verdade (por e-mail, sem essas limitações), dá pra colocar atrás do **Cloudflare Access** (tem plano gratuito pra uso pequeno) — projetos à parte, não vêm configurados aqui.

## Login do painel

O `index.html` pede e-mail e senha antes de mostrar qualquer coisa (e só busca os dados na planilha depois do login). As credenciais ficam configuradas perto do topo do `<script>`:

```js
var AUTH = {
  email: "vitor.dropscale@gmail.com",
  passHash: "8ee50a7960bf9c5bd526fa8f4522a9b611a95878831099e4e8485dbd8a9d50e2"
};
```

`passHash` é o **hash SHA-256** da senha, não a senha em texto puro — assim, quem olhar o código-fonte da página não vê a senha diretamente. Mas repito: isso não é proteção forte (um hash sem "sal" pode ser quebrado por quem tiver tempo e motivo), então **não reutilize aqui uma senha que vocês usam em outra conta importante** (o e-mail sugerido parece ser de uma conta Google de verdade — se a senha `Vitor2026@` for a senha real dessa conta, troquem por uma nova aqui e considerem trocar a senha da conta também).

Pra trocar o e-mail/senha depois: troque o `email`, gere um novo hash da senha nova e cole em `passHash`. Formas de gerar o hash:
- Peça pro Claude gerar pra você.
- Ou abra o Console do navegador (F12) em qualquer página https e rode:
  ```js
  crypto.subtle.digest("SHA-256", new TextEncoder().encode("sua-senha-nova"))
    .then(b => console.log(Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2,"0")).join("")))
  ```

O login fica lembrado no navegador só até a aba fechar (usa `sessionStorage`) — cada pessoa da equipe loga de novo ao abrir uma aba nova.

## Como funciona no dia a dia

- **+ Adicionar review**: cola o link do review do Trustpilot (obrigatório), o link do ticket no Richpanel (se já tiver), a nota, a data do review e, se souber, o responsável. Ele entra automaticamente como **Investigando**.
- **Clicar numa linha** abre o painel de edição à direita: dá pra mudar loja, nota, links, data, responsável, status, o marcador de risco de chargeback e as notas. **Salvar** grava direto na planilha.
- **Status**: Investigando → Contatado → Resolvendo → Resolvido. Marque Resolvido só depois de confirmar no Richpanel/Trustpilot que está fechado.
- **Filtros** (loja, status, nota, busca por responsável/nota/ID) ficam no topo da fila.
- O painel atualiza sozinho a cada 30 segundos, e tem um botão **Atualizar** pra forçar na hora.

## Limitações que valem saber

- **Sem tempo real de verdade**: se duas pessoas editarem o mesmo review ao mesmo tempo, quem salvar por último apaga a mudança da outra. Como a franquia de gente mexendo é pequena, isso deve ser raro — mas vale um combinado de equipe (avisar no Slack antes de editar um review que outra pessoa já está tratando).
- **A URL do Web App, o `SHARED_SECRET` e o login do painel ficam visíveis** pra quem tiver acesso ao repositório/arquivo (é JavaScript rodando no navegador — não tem como esconder de verdade num site estático, veja a seção "Login do painel" acima). Mantenha o repositório privado e não publique a URL fora da equipe.
- **Sem sincronização automática do Trustpilot** — os reviews entram na mão. Se um dia vocês tiverem acesso à API do Trustpilot, dá pra automatizar isso depois (nesse ponto, vale considerar migrar o banco pra algo que o n8n alcance direto, como o Supabase).
