-- =====================================================================
-- Nexus v2 — dados fictícios para desenvolvimento local
-- Roda automaticamente em `npx supabase db reset`, depois das migrations.
-- NÃO usar em produção. Nomes e e-mails são inventados.
-- Login local: cadastre-se em http://localhost:4200 (e-mail/senha só local)
-- com um destes e-mails; o trigger liga a conta ao perfil.
-- Visibilidade (US-36): Bruno (membro) deve ver só o que o envolve; Ana (líder
-- de Sucesso do Aluno) vê todo o setor; Helena (líder da Secretaria) vê tudo abaixo.
-- Datas relativas a current_date para as visões terem sempre conteúdo.
-- Manter coerente com docs/SCHEMA.md (ajustar se o schema mudar).
-- =====================================================================

-- ---------- perfis ----------
insert into public.perfis (id, email, nome, iniciais, is_admin, ativo) values
  ('a0000000-0000-0000-0000-000000000001','admin.teste@estudeemportugal.org','Admin Teste','AT', true,  true),
  ('a0000000-0000-0000-0000-000000000002','helena.martins@estudeemportugal.org','Helena Martins','HM', false, true),
  ('a0000000-0000-0000-0000-000000000003','ana.ribeiro@estudeemportugal.org','Ana Ribeiro','AR', false, true),
  ('a0000000-0000-0000-0000-000000000004','bruno.costa@estudeemportugal.org','Bruno Costa','BC', false, true),
  ('a0000000-0000-0000-0000-000000000005','gabriela.lopes@estudeemportugal.org','Gabriela Lopes','GL', false, true),
  ('a0000000-0000-0000-0000-000000000006','carla.mendes@estudeemportugal.org','Carla Mendes','CM', false, true),
  ('a0000000-0000-0000-0000-000000000007','diogo.alves@estudeemportugal.org','Diogo Alves','DA', false, true),
  ('a0000000-0000-0000-0000-000000000008','igor.prado@estudeemportugal.org','Igor Prado','IP', false, true),
  ('a0000000-0000-0000-0000-000000000009','fabio.nunes@estudeemportugal.org','Fábio Nunes','FN', false, true),
  ('a0000000-0000-0000-0000-000000000010','elisa.rocha@estudeemportugal.org','Elisa Rocha','ER', false, true),
  ('a0000000-0000-0000-0000-000000000011','ex.colaborador@estudeemportugal.org','Ex Colaborador','EC', false, false);

-- ---------- setores ----------
insert into public.setores (id, nome, pai_id, criado_por) values
  ('b0000000-0000-0000-0000-000000000001','Secretaria',          null,                                   'a0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000002','Documentação',        'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000003','Atendimento',         'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000004','Pedagógico',          'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000005','Sucesso do Aluno',    'b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000006','Formadores',          'b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000007','Plataforma',          'b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000008','Financeiro',          null,                                   'a0000000-0000-0000-0000-000000000001');

-- ---------- vinculos ----------
insert into public.vinculos (perfil_id, setor_id, papel) values
  ('a0000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000001','lider'),   -- Helena: Secretaria (herda tudo abaixo)
  ('a0000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000005','lider'),   -- Ana: Sucesso do Aluno
  ('a0000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000006','membro'),
  ('a0000000-0000-0000-0000-000000000004','b0000000-0000-0000-0000-000000000005','membro'),  -- Bruno
  ('a0000000-0000-0000-0000-000000000004','b0000000-0000-0000-0000-000000000003','membro'),
  ('a0000000-0000-0000-0000-000000000005','b0000000-0000-0000-0000-000000000005','membro'),  -- Gabriela
  ('a0000000-0000-0000-0000-000000000005','b0000000-0000-0000-0000-000000000007','membro'),
  ('a0000000-0000-0000-0000-000000000006','b0000000-0000-0000-0000-000000000006','lider'),   -- Carla: Formadores
  ('a0000000-0000-0000-0000-000000000007','b0000000-0000-0000-0000-000000000004','lider'),   -- Diogo: Pedagógico
  ('a0000000-0000-0000-0000-000000000008','b0000000-0000-0000-0000-000000000003','lider'),   -- Igor: Atendimento
  ('a0000000-0000-0000-0000-000000000009','b0000000-0000-0000-0000-000000000007','lider'),   -- Fábio: Plataforma
  ('a0000000-0000-0000-0000-000000000010','b0000000-0000-0000-0000-000000000008','lider'),   -- Elisa: Financeiro
  ('a0000000-0000-0000-0000-000000000011','b0000000-0000-0000-0000-000000000005','membro');  -- inativo

-- ---------- itens (projetos, tarefas, subtarefas) ----------
insert into public.itens (id, setor_id, pai_id, nivel, nome, descricao_html, status, prioridade, inicio, prazo, motivo_bloqueio_html, aprovador_id, parado_desde, recorrencia, concluido_em, criado_por) values
  -- Projeto 1 — Sucesso do Aluno
  ('c0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000005', null, 0, 'Turmas de novembro',
   '<p>Preparar tudo o que as <b>turmas de novembro</b> precisam antes do início das aulas.</p>',
   'em_andamento','alta', current_date - 14, current_date + 30, null, null, null, null, null, 'a0000000-0000-0000-0000-000000000003'),
  ('c0000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000005','c0000000-0000-0000-0000-000000000001', 1, 'Atualizar calendário de aulas',
   '<p>Montar o calendário de novembro e publicar na plataforma.</p>',
   'bloqueada','alta', current_date - 10, current_date + 2,
   '<p>A subtarefa <b>Fechar agenda com os formadores</b> depende do setor Pedagógico.</p>', null, now() - interval '7 days', null, null, 'a0000000-0000-0000-0000-000000000003'),
  ('c0000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000005','c0000000-0000-0000-0000-000000000002', 2, 'Levantar datas disponíveis da sala', '',
   'concluida','media', current_date - 10, current_date - 4, null, null, null, null, now() - interval '5 days', 'a0000000-0000-0000-0000-000000000004'),
  ('c0000000-0000-0000-0000-000000000004','b0000000-0000-0000-0000-000000000005','c0000000-0000-0000-0000-000000000002', 2, 'Confirmar feriados de novembro', '',
   'concluida','baixa', current_date - 10, current_date - 4, null, null, null, null, now() - interval '3 days', 'a0000000-0000-0000-0000-000000000004'),
  ('c0000000-0000-0000-0000-000000000005','b0000000-0000-0000-0000-000000000005','c0000000-0000-0000-0000-000000000002', 2, 'Fechar agenda com os formadores',
   '<p>Cruzar a disponibilidade de cada formador com as datas da sala.</p>',
   'bloqueada','alta', current_date - 8, current_date,
   '<p>Aguardando a disponibilidade dos formadores, enviada pelo <b>Pedagógico</b>.</p>', null, now() - interval '7 days', null, null, 'a0000000-0000-0000-0000-000000000004'),
  ('c0000000-0000-0000-0000-000000000006','b0000000-0000-0000-0000-000000000005','c0000000-0000-0000-0000-000000000002', 2, 'Publicar calendário na plataforma', '',
   'a_fazer','media', current_date + 1, current_date + 2, null, null, null, null, null, 'a0000000-0000-0000-0000-000000000004'),
  ('c0000000-0000-0000-0000-000000000007','b0000000-0000-0000-0000-000000000005','c0000000-0000-0000-0000-000000000001', 1, 'Enviar boas-vindas à turma A',
   '<p>E-mail de boas-vindas com acesso à plataforma.</p>',
   'em_andamento','media', current_date - 6, current_date - 1, null, null, null, null, null, 'a0000000-0000-0000-0000-000000000003'),
  ('c0000000-0000-0000-0000-000000000008','b0000000-0000-0000-0000-000000000005','c0000000-0000-0000-0000-000000000001', 1, 'Liberar acessos de tutores da turma B', '',
   'bloqueada','alta', current_date - 3, current_date + 4,
   '<p>Liberar permissões de tutor para a turma B.</p>', null, now() - interval '1 day', null, null, 'a0000000-0000-0000-0000-000000000005'),
  ('c0000000-0000-0000-0000-000000000009','b0000000-0000-0000-0000-000000000005','c0000000-0000-0000-0000-000000000001', 1, 'Relatório semanal de presenças', '',
   'a_fazer','baixa', current_date, current_date + 5, null, null, null, 'semanal', null, 'a0000000-0000-0000-0000-000000000003'),
  -- Projeto 2 — Formadores
  ('c0000000-0000-0000-0000-000000000010','b0000000-0000-0000-0000-000000000006', null, 0, 'Contratação de formadores 2027', '',
   'em_andamento','media', current_date - 20, current_date + 60, null, null, null, null, null, 'a0000000-0000-0000-0000-000000000006'),
  ('c0000000-0000-0000-0000-000000000011','b0000000-0000-0000-0000-000000000006','c0000000-0000-0000-0000-000000000010', 1, 'Aprovar orçamento de formadores', '',
   'aguardando_aprovacao','alta', current_date - 5, current_date + 3, null,
   'a0000000-0000-0000-0000-000000000007', now() - interval '3 days', null, null, 'a0000000-0000-0000-0000-000000000006'),
  ('c0000000-0000-0000-0000-000000000012','b0000000-0000-0000-0000-000000000006','c0000000-0000-0000-0000-000000000010', 1, 'Publicar vagas no portal', '',
   'concluida','media', current_date - 18, current_date - 9, null, null, null, null, now() - interval '10 days', 'a0000000-0000-0000-0000-000000000006'),
  -- Projeto 3 — Plataforma
  ('c0000000-0000-0000-0000-000000000013','b0000000-0000-0000-0000-000000000007', null, 0, 'Migração de cursos para a nova plataforma', '',
   'a_fazer','media', current_date + 7, current_date + 90, null, null, null, null, null, 'a0000000-0000-0000-0000-000000000009'),
  ('c0000000-0000-0000-0000-000000000014','b0000000-0000-0000-0000-000000000007','c0000000-0000-0000-0000-000000000013', 1, 'Inventário de cursos ativos', '',
   'em_andamento','media', current_date - 2, current_date + 12, null, null, null, null, null, 'a0000000-0000-0000-0000-000000000009'),
  -- Projeto 4 — Financeiro (Bruno/Ana não devem ver)
  ('c0000000-0000-0000-0000-000000000015','b0000000-0000-0000-0000-000000000008', null, 0, 'Fecho do trimestre', '',
   'em_andamento','alta', current_date - 30, current_date + 10, null, null, null, null, null, 'a0000000-0000-0000-0000-000000000010'),
  ('c0000000-0000-0000-0000-000000000016','b0000000-0000-0000-0000-000000000008','c0000000-0000-0000-0000-000000000015', 1, 'Conciliar pagamentos de formadores', '',
   'a_fazer','alta', current_date, current_date + 8, null, null, null, null, null, 'a0000000-0000-0000-0000-000000000010'),
  -- Tarefas avulsas (sem projeto)
  ('c0000000-0000-0000-0000-000000000017','b0000000-0000-0000-0000-000000000005', null, 1, 'Responder dúvidas da caixa partilhada',
   '<p>Triagem diária das dúvidas dos formandos.</p>','em_andamento','media', current_date - 1, current_date + 1, null, null, null, 'diaria', null, 'a0000000-0000-0000-0000-000000000003'),
  ('c0000000-0000-0000-0000-000000000018','b0000000-0000-0000-0000-000000000005','c0000000-0000-0000-0000-000000000017', 2, 'Atualizar respostas frequentes', '',
   'a_fazer','baixa', current_date, current_date + 6, null, null, null, null, null, 'a0000000-0000-0000-0000-000000000004');

-- ---------- item_responsaveis (vários responsáveis por item) ----------
insert into public.item_responsaveis (item_id, perfil_id, atribuido_por) values
  ('c0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000003'),
  ('c0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000003'),
  ('c0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000003'),
  ('c0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000003'),
  ('c0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000003'),
  ('c0000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000003'),
  ('c0000000-0000-0000-0000-000000000007','a0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000003'),
  ('c0000000-0000-0000-0000-000000000008','a0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000003'),
  ('c0000000-0000-0000-0000-000000000009','a0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000003'),
  ('c0000000-0000-0000-0000-000000000010','a0000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000003'),
  ('c0000000-0000-0000-0000-000000000011','a0000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000003'),
  ('c0000000-0000-0000-0000-000000000012','a0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000003'),
  ('c0000000-0000-0000-0000-000000000013','a0000000-0000-0000-0000-000000000009','a0000000-0000-0000-0000-000000000003'),
  ('c0000000-0000-0000-0000-000000000014','a0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000003'),
  ('c0000000-0000-0000-0000-000000000015','a0000000-0000-0000-0000-000000000010','a0000000-0000-0000-0000-000000000003'),
  ('c0000000-0000-0000-0000-000000000016','a0000000-0000-0000-0000-000000000010','a0000000-0000-0000-0000-000000000003'),
  ('c0000000-0000-0000-0000-000000000017','a0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000003'),
  ('c0000000-0000-0000-0000-000000000017','a0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000003'),
  ('c0000000-0000-0000-0000-000000000018','a0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000003'),
  ('c0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000003');

-- ---------- checklist ----------
insert into public.checklist_itens (item_id, texto, feito, ordem) values
  ('c0000000-0000-0000-0000-000000000002','Confirmar número de turmas', true, 1),
  ('c0000000-0000-0000-0000-000000000002','Revisar modelo do calendário', true, 2),
  ('c0000000-0000-0000-0000-000000000002','Enviar rascunho para a coordenação', false, 3),
  ('c0000000-0000-0000-0000-000000000005','Receber disponibilidade do Pedagógico', false, 1),
  ('c0000000-0000-0000-0000-000000000005','Cruzar com as datas da sala', false, 2),
  ('c0000000-0000-0000-0000-000000000005','Validar com a coordenação', false, 3);

-- ---------- dependencias ----------
insert into public.dependencias (item_id, depende_de_id) values
  ('c0000000-0000-0000-0000-000000000006','c0000000-0000-0000-0000-000000000005'),  -- publicar depende de fechar agenda
  ('c0000000-0000-0000-0000-000000000007','c0000000-0000-0000-0000-000000000006');  -- boas-vindas depende de publicar

-- ---------- solicitacoes ----------
insert into public.solicitacoes (id, item_id, de_id, para_id, tipo, texto_html, status, criado_em, respondido_em) values
  ('d0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000007','acao',
   '<p>Enviar a <b>disponibilidade dos formadores</b> para novembro.</p>','pendente', now() - interval '7 days', null),
  ('d0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000008','a0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000009','acao',
   '<p>Liberar permissões de tutor para a turma B.</p>','pendente', now() - interval '1 day', null),
  ('d0000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000011','a0000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000007','aprovacao',
   '<p>Aprovar o orçamento de contratação de 4 formadores.</p>','pendente', now() - interval '3 days', null),
  ('d0000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000012','a0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000008','informacao',
   '<p>Qual o e-mail certo para receber candidaturas?</p>','resolvida', now() - interval '15 days', now() - interval '14 days');

insert into public.solicitacao_mensagens (solicitacao_id, autor_id, texto_html, criado_em) values
  ('d0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000004','<p>Preciso das datas de cada formador para fechar o calendário.</p>', now() - interval '7 days'),
  ('d0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000007','<p>Faltam <b>dois formadores</b> responderem. Envio assim que tiver.</p>', now() - interval '2 days'),
  ('d0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000005','<p>Os tutores da turma B ainda não conseguem corrigir atividades.</p>', now() - interval '1 day'),
  ('d0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000008','<p>Usem candidaturas@ — já está configurado.</p>', now() - interval '14 days');

-- ---------- comentarios + mencoes ----------
insert into public.comentarios (id, item_id, autor_id, texto_html, criado_em) values
  ('e0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000003',
   '<p><span class="mention" data-uid="a0000000-0000-0000-0000-000000000004">@Bruno Costa</span> prioridade máxima esta semana, por favor.</p>', now() - interval '2 days'),
  ('e0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000004',
   '<p>Combinado. Só falta a parte do <i>Pedagógico</i>.</p>', now() - interval '1 day'),
  ('e0000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000014','a0000000-0000-0000-0000-000000000005',
   '<p>Já listei 42 cursos; faltam os de Marketing.</p>', now() - interval '6 hours');

insert into public.mencoes (comentario_id, perfil_id) values
  ('e0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000004');

-- ---------- anexos (só links externos no seed; nada no Storage) ----------
insert into public.anexos (item_id, comentario_id, nome, link_externo, enviado_por) values
  ('c0000000-0000-0000-0000-000000000002', null, 'calendario-rascunho (Drive)', 'https://drive.google.com/exemplo-calendario', 'a0000000-0000-0000-0000-000000000004'),
  ('c0000000-0000-0000-0000-000000000014', 'e0000000-0000-0000-0000-000000000003', 'inventario-cursos (Drive)', 'https://drive.google.com/exemplo-inventario', 'a0000000-0000-0000-0000-000000000005');

-- Notificações e histórico ficam vazios: são gerados pelos triggers/RPCs durante o uso.
-- Se algum trigger do seed gerar notificações, limpe para não disparar e-mails locais:
delete from public.notificacoes;
