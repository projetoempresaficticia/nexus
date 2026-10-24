
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "anexos": {
                  Row: {
                    "caminho": string | null,"comentario_id": string | null,"criado_em": string,"enviado_por": string,"id": string,"item_id": string,"link_externo": string | null,"mime": string | null,"nome": string,"tamanho_bytes": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "caminho"?: string | null,"comentario_id"?: string | null,"criado_em"?: string,"enviado_por": string,"id"?: string,"item_id": string,"link_externo"?: string | null,"mime"?: string | null,"nome": string,"tamanho_bytes"?: number | null
                  }
                  Update: {
                    "caminho"?: string | null,"comentario_id"?: string | null,"criado_em"?: string,"enviado_por"?: string,"id"?: string,"item_id"?: string,"link_externo"?: string | null,"mime"?: string | null,"nome"?: string,"tamanho_bytes"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "anexos_comentario_id_fkey"
      columns: ["comentario_id"]
isOneToOne: false
      referencedRelation: "comentarios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "anexos_enviado_por_fkey"
      columns: ["enviado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "anexos_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "itens"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "anexos_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "vw_itens"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "anexos_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "vw_produtividade"
      referencedColumns: ["item_id"]
    }
                  ]
                },"checklist_itens": {
                  Row: {
                    "feito": boolean,"id": string,"item_id": string,"ordem": number,"texto": string
                  }
                  ComputedFields: never
                  Insert: {
                    "feito"?: boolean,"id"?: string,"item_id": string,"ordem"?: number,"texto": string
                  }
                  Update: {
                    "feito"?: boolean,"id"?: string,"item_id"?: string,"ordem"?: number,"texto"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "checklist_itens_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "itens"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "checklist_itens_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "vw_itens"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "checklist_itens_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "vw_produtividade"
      referencedColumns: ["item_id"]
    }
                  ]
                },"checklist_mencoes": {
                  Row: {
                    "checklist_id": string,"perfil_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "checklist_id": string,"perfil_id": string
                  }
                  Update: {
                    "checklist_id"?: string,"perfil_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "checklist_mencoes_checklist_id_fkey"
      columns: ["checklist_id"]
isOneToOne: false
      referencedRelation: "checklist_itens"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "checklist_mencoes_perfil_id_fkey"
      columns: ["perfil_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    }
                  ]
                },"comentarios": {
                  Row: {
                    "autor_id": string,"criado_em": string,"editado_em": string | null,"id": string,"item_id": string,"legacy_id": string | null,"texto_html": string
                  }
                  ComputedFields: never
                  Insert: {
                    "autor_id": string,"criado_em"?: string,"editado_em"?: string | null,"id"?: string,"item_id": string,"legacy_id"?: string | null,"texto_html": string
                  }
                  Update: {
                    "autor_id"?: string,"criado_em"?: string,"editado_em"?: string | null,"id"?: string,"item_id"?: string,"legacy_id"?: string | null,"texto_html"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "comentarios_autor_id_fkey"
      columns: ["autor_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comentarios_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "itens"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comentarios_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "vw_itens"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comentarios_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "vw_produtividade"
      referencedColumns: ["item_id"]
    }
                  ]
                },"dependencias": {
                  Row: {
                    "depende_de_id": string,"item_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "depende_de_id": string,"item_id": string
                  }
                  Update: {
                    "depende_de_id"?: string,"item_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "dependencias_depende_de_id_fkey"
      columns: ["depende_de_id"]
isOneToOne: false
      referencedRelation: "itens"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dependencias_depende_de_id_fkey"
      columns: ["depende_de_id"]
isOneToOne: false
      referencedRelation: "vw_itens"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dependencias_depende_de_id_fkey"
      columns: ["depende_de_id"]
isOneToOne: false
      referencedRelation: "vw_produtividade"
      referencedColumns: ["item_id"]
    },{
      foreignKeyName: "dependencias_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "itens"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dependencias_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "vw_itens"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dependencias_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "vw_produtividade"
      referencedColumns: ["item_id"]
    }
                  ]
                },"historico": {
                  Row: {
                    "acao": string,"campo": string | null,"criado_em": string,"id": number,"perfil_id": string | null,"registro_id": string,"tabela": string,"valor_antes": string | null,"valor_depois": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "acao": string,"campo"?: string | null,"criado_em"?: string,"id"?: never,"perfil_id"?: string | null,"registro_id": string,"tabela": string,"valor_antes"?: string | null,"valor_depois"?: string | null
                  }
                  Update: {
                    "acao"?: string,"campo"?: string | null,"criado_em"?: string,"id"?: never,"perfil_id"?: string | null,"registro_id"?: string,"tabela"?: string,"valor_antes"?: string | null,"valor_depois"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "historico_perfil_id_fkey"
      columns: ["perfil_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    }
                  ]
                },"item_responsaveis": {
                  Row: {
                    "atribuido_por": string,"criado_em": string,"item_id": string,"perfil_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atribuido_por": string,"criado_em"?: string,"item_id": string,"perfil_id": string
                  }
                  Update: {
                    "atribuido_por"?: string,"criado_em"?: string,"item_id"?: string,"perfil_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "item_responsaveis_atribuido_por_fkey"
      columns: ["atribuido_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "item_responsaveis_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "itens"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "item_responsaveis_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "vw_itens"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "item_responsaveis_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "vw_produtividade"
      referencedColumns: ["item_id"]
    },{
      foreignKeyName: "item_responsaveis_perfil_id_fkey"
      columns: ["perfil_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    }
                  ]
                },"itens": {
                  Row: {
                    "aprovador_id": string | null,"atualizado_em": string,"concluido_em": string | null,"criado_em": string,"criado_por": string,"descricao_html": string,"id": string,"inicio": string | null,"legacy_id": string | null,"motivo_bloqueio_html": string | null,"nivel": number,"nome": string,"ordem": number,"pai_id": string | null,"parado_desde": string | null,"prazo": string | null,"prioridade": Database["public"]['Enums']["prioridade"],"recorrencia": Database["public"]['Enums']["recorrencia"] | null,"setor_id": string,"status": Database["public"]['Enums']["status_item"]
                  }
                  ComputedFields: never
                  Insert: {
                    "aprovador_id"?: string | null,"atualizado_em"?: string,"concluido_em"?: string | null,"criado_em"?: string,"criado_por": string,"descricao_html"?: string,"id"?: string,"inicio"?: string | null,"legacy_id"?: string | null,"motivo_bloqueio_html"?: string | null,"nivel": number,"nome": string,"ordem"?: number,"pai_id"?: string | null,"parado_desde"?: string | null,"prazo"?: string | null,"prioridade"?: Database["public"]['Enums']["prioridade"],"recorrencia"?: Database["public"]['Enums']["recorrencia"] | null,"setor_id": string,"status"?: Database["public"]['Enums']["status_item"]
                  }
                  Update: {
                    "aprovador_id"?: string | null,"atualizado_em"?: string,"concluido_em"?: string | null,"criado_em"?: string,"criado_por"?: string,"descricao_html"?: string,"id"?: string,"inicio"?: string | null,"legacy_id"?: string | null,"motivo_bloqueio_html"?: string | null,"nivel"?: number,"nome"?: string,"ordem"?: number,"pai_id"?: string | null,"parado_desde"?: string | null,"prazo"?: string | null,"prioridade"?: Database["public"]['Enums']["prioridade"],"recorrencia"?: Database["public"]['Enums']["recorrencia"] | null,"setor_id"?: string,"status"?: Database["public"]['Enums']["status_item"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "itens_aprovador_id_fkey"
      columns: ["aprovador_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "itens_criado_por_fkey"
      columns: ["criado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "itens_pai_id_fkey"
      columns: ["pai_id"]
isOneToOne: false
      referencedRelation: "itens"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "itens_pai_id_fkey"
      columns: ["pai_id"]
isOneToOne: false
      referencedRelation: "vw_itens"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "itens_pai_id_fkey"
      columns: ["pai_id"]
isOneToOne: false
      referencedRelation: "vw_produtividade"
      referencedColumns: ["item_id"]
    },{
      foreignKeyName: "itens_setor_id_fkey"
      columns: ["setor_id"]
isOneToOne: false
      referencedRelation: "setores"
      referencedColumns: ["id"]
    }
                  ]
                },"mencoes": {
                  Row: {
                    "comentario_id": string,"perfil_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "comentario_id": string,"perfil_id": string
                  }
                  Update: {
                    "comentario_id"?: string,"perfil_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "mencoes_comentario_id_fkey"
      columns: ["comentario_id"]
isOneToOne: false
      referencedRelation: "comentarios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mencoes_perfil_id_fkey"
      columns: ["perfil_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    }
                  ]
                },"notificacoes": {
                  Row: {
                    "autor_id": string | null,"criado_em": string,"dados": NonNullable<Json>,"destinatario_id": string,"enviado_em": string | null,"erro": string | null,"id": string,"item_id": string | null,"tentativas": number,"tipo": Database["public"]['Enums']["tipo_notificacao"]
                  }
                  ComputedFields: never
                  Insert: {
                    "autor_id"?: string | null,"criado_em"?: string,"dados"?: NonNullable<Json>,"destinatario_id": string,"enviado_em"?: string | null,"erro"?: string | null,"id"?: string,"item_id"?: string | null,"tentativas"?: number,"tipo": Database["public"]['Enums']["tipo_notificacao"]
                  }
                  Update: {
                    "autor_id"?: string | null,"criado_em"?: string,"dados"?: NonNullable<Json>,"destinatario_id"?: string,"enviado_em"?: string | null,"erro"?: string | null,"id"?: string,"item_id"?: string | null,"tentativas"?: number,"tipo"?: Database["public"]['Enums']["tipo_notificacao"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "notificacoes_autor_id_fkey"
      columns: ["autor_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notificacoes_destinatario_id_fkey"
      columns: ["destinatario_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notificacoes_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "itens"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notificacoes_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "vw_itens"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notificacoes_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "vw_produtividade"
      referencedColumns: ["item_id"]
    }
                  ]
                },"perfis": {
                  Row: {
                    "ativo": boolean,"auth_id": string | null,"criado_em": string,"desativado_em": string | null,"email": string,"id": string,"iniciais": string,"is_admin": boolean,"legacy_id": string | null,"nome": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"auth_id"?: string | null,"criado_em"?: string,"desativado_em"?: string | null,"email": string,"id"?: string,"iniciais": string,"is_admin"?: boolean,"legacy_id"?: string | null,"nome": string
                  }
                  Update: {
                    "ativo"?: boolean,"auth_id"?: string | null,"criado_em"?: string,"desativado_em"?: string | null,"email"?: string,"id"?: string,"iniciais"?: string,"is_admin"?: boolean,"legacy_id"?: string | null,"nome"?: string
                  }
                  Relationships: [
                    
                  ]
                },"setores": {
                  Row: {
                    "ativo": boolean,"criado_em": string,"criado_por": string,"id": string,"legacy_id": string | null,"nome": string,"pai_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"criado_em"?: string,"criado_por": string,"id"?: string,"legacy_id"?: string | null,"nome": string,"pai_id"?: string | null
                  }
                  Update: {
                    "ativo"?: boolean,"criado_em"?: string,"criado_por"?: string,"id"?: string,"legacy_id"?: string | null,"nome"?: string,"pai_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "setores_criado_por_fkey"
      columns: ["criado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "setores_pai_id_fkey"
      columns: ["pai_id"]
isOneToOne: false
      referencedRelation: "setores"
      referencedColumns: ["id"]
    }
                  ]
                },"solicitacao_mensagens": {
                  Row: {
                    "autor_id": string,"criado_em": string,"editado_em": string | null,"id": string,"solicitacao_id": string,"texto_html": string
                  }
                  ComputedFields: never
                  Insert: {
                    "autor_id": string,"criado_em"?: string,"editado_em"?: string | null,"id"?: string,"solicitacao_id": string,"texto_html": string
                  }
                  Update: {
                    "autor_id"?: string,"criado_em"?: string,"editado_em"?: string | null,"id"?: string,"solicitacao_id"?: string,"texto_html"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "solicitacao_mensagens_autor_id_fkey"
      columns: ["autor_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "solicitacao_mensagens_solicitacao_id_fkey"
      columns: ["solicitacao_id"]
isOneToOne: false
      referencedRelation: "solicitacoes"
      referencedColumns: ["id"]
    }
                  ]
                },"solicitacoes": {
                  Row: {
                    "criado_em": string,"de_id": string,"editado_em": string | null,"id": string,"item_id": string,"legacy_id": string | null,"para_id": string,"respondido_em": string | null,"status": Database["public"]['Enums']["status_solicitacao"],"texto_html": string,"tipo": Database["public"]['Enums']["tipo_solicitacao"]
                  }
                  ComputedFields: never
                  Insert: {
                    "criado_em"?: string,"de_id": string,"editado_em"?: string | null,"id"?: string,"item_id": string,"legacy_id"?: string | null,"para_id": string,"respondido_em"?: string | null,"status"?: Database["public"]['Enums']["status_solicitacao"],"texto_html": string,"tipo": Database["public"]['Enums']["tipo_solicitacao"]
                  }
                  Update: {
                    "criado_em"?: string,"de_id"?: string,"editado_em"?: string | null,"id"?: string,"item_id"?: string,"legacy_id"?: string | null,"para_id"?: string,"respondido_em"?: string | null,"status"?: Database["public"]['Enums']["status_solicitacao"],"texto_html"?: string,"tipo"?: Database["public"]['Enums']["tipo_solicitacao"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "solicitacoes_de_id_fkey"
      columns: ["de_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "solicitacoes_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "itens"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "solicitacoes_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "vw_itens"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "solicitacoes_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "vw_produtividade"
      referencedColumns: ["item_id"]
    },{
      foreignKeyName: "solicitacoes_para_id_fkey"
      columns: ["para_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    }
                  ]
                },"vinculos": {
                  Row: {
                    "criado_em": string,"papel": Database["public"]['Enums']["papel_setor"],"perfil_id": string,"setor_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "criado_em"?: string,"papel": Database["public"]['Enums']["papel_setor"],"perfil_id": string,"setor_id": string
                  }
                  Update: {
                    "criado_em"?: string,"papel"?: Database["public"]['Enums']["papel_setor"],"perfil_id"?: string,"setor_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "vinculos_perfil_id_fkey"
      columns: ["perfil_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vinculos_setor_id_fkey"
      columns: ["setor_id"]
isOneToOne: false
      referencedRelation: "setores"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "vw_itens": {
                  Row: {
                    "aprovador_id": string | null,"atrasado": boolean | null,"atualizado_em": string | null,"concluido_em": string | null,"criado_em": string | null,"criado_por": string | null,"descricao_html": string | null,"dias_parado": number | null,"id": string | null,"inicio": string | null,"legacy_id": string | null,"meu_envolvimento": (string)[] | null,"motivo_bloqueio_html": string | null,"nivel": number | null,"nome": string | null,"ordem": number | null,"pai_id": string | null,"parado_desde": string | null,"prazo": string | null,"prioridade": Database["public"]['Enums']["prioridade"] | null,"projeto_id": string | null,"qtd_anexos": number | null,"qtd_comentarios": number | null,"qtd_filhos": number | null,"recorrencia": Database["public"]['Enums']["recorrencia"] | null,"responsaveis": (string)[] | null,"setor_id": string | null,"solicitacoes_pendentes": number | null,"status": Database["public"]['Enums']["status_item"] | null
                  }
                  ComputedFields: never
                  Insert: {
                           "aprovador_id"?: string | null,"atrasado"?: never,"atualizado_em"?: string | null,"concluido_em"?: string | null,"criado_em"?: string | null,"criado_por"?: string | null,"descricao_html"?: string | null,"dias_parado"?: never,"id"?: string | null,"inicio"?: string | null,"legacy_id"?: string | null,"meu_envolvimento"?: never,"motivo_bloqueio_html"?: string | null,"nivel"?: number | null,"nome"?: string | null,"ordem"?: number | null,"pai_id"?: string | null,"parado_desde"?: string | null,"prazo"?: string | null,"prioridade"?: Database["public"]['Enums']["prioridade"] | null,"projeto_id"?: never,"qtd_anexos"?: never,"qtd_comentarios"?: never,"qtd_filhos"?: never,"recorrencia"?: Database["public"]['Enums']["recorrencia"] | null,"responsaveis"?: never,"setor_id"?: string | null,"solicitacoes_pendentes"?: never,"status"?: Database["public"]['Enums']["status_item"] | null
                         }
                        Update: {
                           "aprovador_id"?: string | null,"atrasado"?: never,"atualizado_em"?: string | null,"concluido_em"?: string | null,"criado_em"?: string | null,"criado_por"?: string | null,"descricao_html"?: string | null,"dias_parado"?: never,"id"?: string | null,"inicio"?: string | null,"legacy_id"?: string | null,"meu_envolvimento"?: never,"motivo_bloqueio_html"?: string | null,"nivel"?: number | null,"nome"?: string | null,"ordem"?: number | null,"pai_id"?: string | null,"parado_desde"?: string | null,"prazo"?: string | null,"prioridade"?: Database["public"]['Enums']["prioridade"] | null,"projeto_id"?: never,"qtd_anexos"?: never,"qtd_comentarios"?: never,"qtd_filhos"?: never,"recorrencia"?: Database["public"]['Enums']["recorrencia"] | null,"responsaveis"?: never,"setor_id"?: string | null,"solicitacoes_pendentes"?: never,"status"?: Database["public"]['Enums']["status_item"] | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "itens_aprovador_id_fkey"
      columns: ["aprovador_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "itens_criado_por_fkey"
      columns: ["criado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "itens_pai_id_fkey"
      columns: ["pai_id"]
isOneToOne: false
      referencedRelation: "itens"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "itens_pai_id_fkey"
      columns: ["pai_id"]
isOneToOne: false
      referencedRelation: "vw_itens"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "itens_pai_id_fkey"
      columns: ["pai_id"]
isOneToOne: false
      referencedRelation: "vw_produtividade"
      referencedColumns: ["item_id"]
    },{
      foreignKeyName: "itens_setor_id_fkey"
      columns: ["setor_id"]
isOneToOne: false
      referencedRelation: "setores"
      referencedColumns: ["id"]
    }
                  ]
                },"vw_produtividade": {
                  Row: {
                    "concluido_em": string | null,"dias_ciclo": number | null,"dias_parado_total": number | null,"inicio": string | null,"item_id": string | null,"nivel": number | null,"no_prazo": boolean | null,"nome": string | null,"perfil_id": string | null,"prazo": string | null,"setor_id": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "item_responsaveis_perfil_id_fkey"
      columns: ["perfil_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "itens_setor_id_fkey"
      columns: ["setor_id"]
isOneToOne: false
      referencedRelation: "setores"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "abrir_solicitacao":
{ Args: { "p_item_id": string,"p_para_id": string,"p_texto_html": string,"p_tipo": Database["public"]['Enums']["tipo_solicitacao"] }; Returns: Json
                           },
"atualizar_item":
{ Args: { "p_campos": Json,"p_id": string }; Returns: {
              "aprovador_id": string | null,
"atrasado": boolean | null,
"atualizado_em": string | null,
"concluido_em": string | null,
"criado_em": string | null,
"criado_por": string | null,
"descricao_html": string | null,
"dias_parado": number | null,
"id": string | null,
"inicio": string | null,
"legacy_id": string | null,
"meu_envolvimento": (string)[] | null,
"motivo_bloqueio_html": string | null,
"nivel": number | null,
"nome": string | null,
"ordem": number | null,
"pai_id": string | null,
"parado_desde": string | null,
"prazo": string | null,
"prioridade": Database["public"]['Enums']["prioridade"] | null,
"projeto_id": string | null,
"qtd_anexos": number | null,
"qtd_comentarios": number | null,
"qtd_filhos": number | null,
"recorrencia": Database["public"]['Enums']["recorrencia"] | null,
"responsaveis": (string)[] | null,
"setor_id": string | null,
"solicitacoes_pendentes": number | null,
"status": Database["public"]['Enums']["status_item"] | null
            }
                          SetofOptions: {
        from: "*"
        to: "vw_itens"
        isOneToOne: true
        isSetofReturn: false
      } },
"auth_hook_antes_criar_usuario":
{ Args: { "event": Json }; Returns: Json
                           },
"cadastrar_usuario":
{ Args: { "p_email": string,"p_nome": string,"p_vinculos"?: Json }; Returns: {
              "ativo": boolean,
"auth_id": string | null,
"criado_em": string,
"desativado_em": string | null,
"email": string,
"id": string,
"iniciais": string,
"is_admin": boolean,
"legacy_id": string | null,
"nome": string
            }
                          SetofOptions: {
        from: "*"
        to: "perfis"
        isOneToOne: true
        isSetofReturn: false
      } },
"cancelar_solicitacao":
{ Args: { "p_id": string }; Returns: Json
                           },
"carga_trabalho":
{ Args: { "p_ate": string,"p_de": string,"p_setores": (string)[] }; Returns: {
              "perfil_id": string,"qtd": number,"semana": string
            }[]
                           },
"carregar_inicial":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"contar_descendentes":
{ Args: { "p_id": string }; Returns: number
                           },
"criar_item":
{ Args: { "p": Json }; Returns: {
              "aprovador_id": string | null,
"atrasado": boolean | null,
"atualizado_em": string | null,
"concluido_em": string | null,
"criado_em": string | null,
"criado_por": string | null,
"descricao_html": string | null,
"dias_parado": number | null,
"id": string | null,
"inicio": string | null,
"legacy_id": string | null,
"meu_envolvimento": (string)[] | null,
"motivo_bloqueio_html": string | null,
"nivel": number | null,
"nome": string | null,
"ordem": number | null,
"pai_id": string | null,
"parado_desde": string | null,
"prazo": string | null,
"prioridade": Database["public"]['Enums']["prioridade"] | null,
"projeto_id": string | null,
"qtd_anexos": number | null,
"qtd_comentarios": number | null,
"qtd_filhos": number | null,
"recorrencia": Database["public"]['Enums']["recorrencia"] | null,
"responsaveis": (string)[] | null,
"setor_id": string | null,
"solicitacoes_pendentes": number | null,
"status": Database["public"]['Enums']["status_item"] | null
            }
                          SetofOptions: {
        from: "*"
        to: "vw_itens"
        isOneToOne: true
        isSetofReturn: false
      } },
"definir_dependencia":
{ Args: { "p_depende_de": string,"p_item": string,"p_ligar": boolean }; Returns: undefined
                           },
"definir_responsaveis":
{ Args: { "p_item": string,"p_perfis": (string)[] }; Returns: (string)[]
                           },
"desativar_usuario":
{ Args: { "p_id": string }; Returns: Json
                           },
"editar_solicitacao":
{ Args: { "p_id": string,"p_texto_html": string }; Returns: Json
                           },
"excluir_item":
{ Args: { "p_id": string }; Returns: Json
                           },
"mudar_status":
{ Args: { "p_aprovador_id"?: string,"p_id": string,"p_motivo_html"?: string,"p_status": Database["public"]['Enums']["status_item"] }; Returns: Json
                           },
"pessoas_inativas":
{ Args: Record<PropertyKey, never>; Returns: {
              "id": string,"iniciais": string,"nome": string
            }[]
                           },
"reativar_usuario":
{ Args: { "p_id": string }; Returns: {
              "ativo": boolean,
"auth_id": string | null,
"criado_em": string,
"desativado_em": string | null,
"email": string,
"id": string,
"iniciais": string,
"is_admin": boolean,
"legacy_id": string | null,
"nome": string
            }
                          SetofOptions: {
        from: "*"
        to: "perfis"
        isOneToOne: true
        isSetofReturn: false
      } },
"reatribuir_itens":
{ Args: { "p_de": string,"p_ids"?: (string)[],"p_para": string }; Returns: number
                           },
"responder_solicitacao":
{ Args: { "p_id": string,"p_mensagem_html"?: string,"p_resultado": Database["public"]['Enums']["status_solicitacao"] }; Returns: Json
                           },
"resumo_painel":
{ Args: { "p_setores": (string)[] }; Returns: Json
                           },
"salvar_comentario":
{ Args: { "p_id": string,"p_item_id": string,"p_texto_html": string }; Returns: {
              "autor_id": string,
"criado_em": string,
"editado_em": string | null,
"id": string,
"item_id": string,
"legacy_id": string | null,
"texto_html": string
            }
                          SetofOptions: {
        from: "*"
        to: "comentarios"
        isOneToOne: true
        isSetofReturn: false
      } },
"salvar_setor":
{ Args: { "p": Json }; Returns: {
              "ativo": boolean,
"criado_em": string,
"criado_por": string,
"id": string,
"legacy_id": string | null,
"nome": string,
"pai_id": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "setores"
        isOneToOne: true
        isSetofReturn: false
      } },
"salvar_vinculos":
{ Args: { "p_perfil_id": string,"p_vinculos": Json }; Returns: Json
                           }
          }
          Enums: {
            "papel_setor": "lider"|"membro","prioridade": "alta"|"media"|"baixa","recorrencia": "diaria"|"semanal"|"quinzenal"|"mensal"|"anual","status_item": "a_fazer"|"em_andamento"|"bloqueada"|"aguardando_aprovacao"|"concluida","status_solicitacao": "pendente"|"resolvida"|"aprovada"|"recusada","tipo_notificacao": "boas_vindas"|"atribuicao"|"mencao"|"comentario"|"solicitacao_recebida"|"solicitacao_respondida"|"lembrete_prazo","tipo_solicitacao": "informacao"|"acao"|"aprovacao"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "papel_setor": ["lider", "membro"],"prioridade": ["alta", "media", "baixa"],"recorrencia": ["diaria", "semanal", "quinzenal", "mensal", "anual"],"status_item": ["a_fazer", "em_andamento", "bloqueada", "aguardando_aprovacao", "concluida"],"status_solicitacao": ["pendente", "resolvida", "aprovada", "recusada"],"tipo_notificacao": ["boas_vindas", "atribuicao", "mencao", "comentario", "solicitacao_recebida", "solicitacao_respondida", "lembrete_prazo"],"tipo_solicitacao": ["informacao", "acao", "aprovacao"]
          }
        }
} as const
