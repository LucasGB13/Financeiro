# Meu Financeiro

Dashboard financeira responsiva que pode ser instalada na tela inicial do celular e no computador. O protótipo salva os lançamentos neste dispositivo com `localStorage`.

## Recursos

- Resumo mensal de entradas, saídas e saldo, com navegação entre meses.
- Registro de receitas e despesas por categoria.
- Faturas com data de vencimento, valor de parcela e quantidade de parcelas restantes.
- Meta de poupança calculada como percentual do salário, com valor já guardado e progresso.
- Filtro de categorias, ocultação de valores e personalização do nome.

## Privacidade e publicação

Esta primeira versão é local: os dados ficam no navegador e não são sincronizados entre dispositivos. O ícone de atalho facilita abrir no computador; em celular, hospede o site em HTTPS e escolha “Adicionar à tela inicial”.

O GitHub Pages pode hospedar a interface, mas não protege o acesso privado a dados financeiros. Antes de usar no celular com dados reais, configure um backend (por exemplo, Supabase) com autenticação por e-mail e senha, políticas RLS para cada usuário e banco de dados. O arquivo `.env.example` mostra os nomes das variáveis públicas necessárias; nunca coloque senha de usuário ou chave `service_role` no site ou no GitHub.

## Banco Supabase sugerido

Crie as tabelas `transactions`, `bills` e `savings_plans`, cada uma com uma coluna `user_id uuid references auth.users(id)`, e habilite RLS. Use políticas que restrinjam leitura, inserção, edição e exclusão a `auth.uid() = user_id`. Configure autenticação por senha e confirme o e-mail da conta. Em seguida integre o cliente Supabase ao aplicativo, publique a interface em um serviço HTTPS e use o mesmo backend no computador e no celular.

## Abrir localmente

Abra `index.html` no navegador. Não há dependências de servidor nesta versão local.
