# Meu Financeiro

Aplicativo financeiro responsivo com login Google e dados sincronizados por conta no Supabase. Lucas e o pai podem usar o mesmo endereço com contas Google distintas; cada conta só acessa os próprios lançamentos, faturas e meta.

## O que já está pronto

- Interface adaptável a computador e celular, instalável como atalho/PWA.
- Login Google via Supabase Auth.
- Persistência em PostgreSQL para lançamentos, faturas e metas.
- Políticas RLS por `auth.uid()` em todas as tabelas. Não desative RLS nem use chave `service_role` no navegador.
- Configuração pública do cliente em `config.js`. A URL do projeto e a chave `anon`/`publishable` podem ser expostas no front-end; as políticas RLS são obrigatórias.
- Planejamento mensal considera dois pagamentos quinzenais, contas e parcelas ativas, além de outras despesas e entradas lançadas. Contas marcadas como recorrentes continuam no cálculo mensal.
- A conta PicPay pode ser marcada como cartão de limite reutilizável. Cada uso registrado entra como despesa do mês; os outros cartões continuam como contas comuns.
- Contas podem ser editadas e marcadas como pagas por ciclo mensal; o painel avisa sobre vencimentos nos próximos sete dias e contas atrasadas.

## Configuração necessária antes de usar dados reais

### 1. Criar e preparar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com/).
2. No SQL Editor do projeto, execute o arquivo `supabase/schema.sql`.
3. Em Project Settings → API, copie a Project URL e a chave `anon` ou `publishable`.
4. Preencha os campos `supabaseUrl` e `supabaseAnonKey` em `config.js`.

### 2. Ativar login Google

1. No Google Cloud Console, crie um cliente OAuth do tipo aplicação Web.
2. Em Authorized redirect URIs, adicione a Callback URL mostrada em Supabase → Authentication → Sign In / Providers → Google.
3. Ative Google em Supabase → Authentication → Sign In / Providers e informe o Client ID e o Client Secret fornecidos pelo Google.
4. Em Supabase → Authentication → URL Configuration, defina a URL publicada do site como Site URL e adicione também a URL de desenvolvimento/local às Redirect URLs permitidas.
5. Nunca coloque o Google Client Secret ou a chave Supabase `service_role` neste repositório ou em `config.js`.

### 3. Publicar

Hospede a pasta como site estático em HTTPS. GitHub Pages, Cloudflare Pages e Netlify são opções. Cadastre a URL pública do site na configuração de URLs do Supabase e no OAuth do Google. Só depois de banco, OAuth e URLs estarem configurados o botão Google permitirá entrar.

## Privacidade e dados

Cada tabela guarda `user_id` e aplica Row Level Security para que a pessoa autenticada só consiga ler e alterar linhas com seu próprio ID. Não compartilhe a mesma conta Google entre os dois usuários. Se o navegador encontrar dados do protótipo antigo, o aplicativo pergunta antes de copiar esses dados para a conta Google conectada; a cópia local não é apagada.

O salário no planejamento é informado por pagamento quinzenal; o saldo e a meta de economia usam duas vezes esse valor como renda mensal. As contas cadastradas são descontadas automaticamente do saldo previsto. Registre em “Novo lançamento” apenas outras entradas e despesas para não contar uma conta duas vezes. Contas recorrentes sem fim podem ser marcadas no formulário próprio.

## Modo local antigo

A primeira versão usava `localStorage`. A integração atual usa exclusivamente a conta autenticada e o banco Supabase, evitando confundir dados locais entre usuários ou dispositivos.
