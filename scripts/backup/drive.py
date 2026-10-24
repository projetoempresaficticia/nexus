"""Backups do Nexus no Google Drive (Drive partilhado da empresa), via conta de serviço.

Uso (no workflow .github/workflows/backup-supabase.yml):
  python drive.py existe   <nome>            -> imprime "sim" ou "nao"
  python drive.py enviar   <arquivo>         -> envia (substitui um de mesmo nome) e confere
  python drive.py retencao <diarios> <meses> -> manda para a lixeira o que sair da retenção

Variáveis: GDRIVE_SA_ARQUIVO (caminho do JSON da conta de serviço) e GDRIVE_FOLDER_ID.
Nunca imprime o ID da pasta, o e-mail da conta de serviço nem conteúdo do backup.

Retenção: os <diarios> backups mais recentes + o primeiro de cada um dos últimos <meses> meses.
Os demais vão para a LIXEIRA do Drive partilhado (esvaziada sozinha após 30 dias); o papel
"Gestor de conteúdo" basta para isso, ao contrário da exclusão definitiva.
"""

import os
import re
import sys
from datetime import date

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

PADRAO = re.compile(r"^nexus-backup-(\d{4})-(\d{2})-(\d{2})\.sql\.gz\.gpg$")
COMUM = {"supportsAllDrives": True}


def servico():
    cred = service_account.Credentials.from_service_account_file(
        os.environ["GDRIVE_SA_ARQUIVO"], scopes=["https://www.googleapis.com/auth/drive"]
    )
    return build("drive", "v3", credentials=cred, cache_discovery=False)


def listar(drive, pasta, nome=None):
    consulta = f"'{pasta}' in parents and trashed = false"
    if nome:
        consulta += f" and name = '{nome}'"
    arquivos, pagina = [], None
    while True:
        r = (
            drive.files()
            .list(
                q=consulta,
                fields="nextPageToken, files(id, name, size)",
                includeItemsFromAllDrives=True,
                corpora="allDrives",
                pageSize=1000,
                pageToken=pagina,
                **COMUM,
            )
            .execute()
        )
        arquivos += r.get("files", [])
        pagina = r.get("nextPageToken")
        if not pagina:
            return arquivos


def lixeira(drive, arquivo_id):
    drive.files().update(fileId=arquivo_id, body={"trashed": True}, **COMUM).execute()


def existe(drive, pasta, nome):
    print("sim" if listar(drive, pasta, nome) else "nao")


def enviar(drive, pasta, caminho):
    nome = os.path.basename(caminho)
    if not PADRAO.match(nome):
        sys.exit(f"nome inesperado: {nome}")
    antigos = listar(drive, pasta, nome)
    midia = MediaFileUpload(caminho, mimetype="application/octet-stream", resumable=True)
    novo = (
        drive.files()
        .create(body={"name": nome, "parents": [pasta]}, media_body=midia, fields="id, size", **COMUM)
        .execute()
    )
    if int(novo.get("size", 0)) != os.path.getsize(caminho):
        sys.exit("tamanho no Drive diferente do arquivo local")
    for a in antigos:  # execução manual no mesmo dia: fica só a cópia nova
        lixeira(drive, a["id"])
    print(f"enviado: {nome} ({os.path.getsize(caminho)} bytes)")


def retencao(drive, pasta, diarios, meses):
    backups = []
    for a in listar(drive, pasta):
        m = PADRAO.match(a["name"])
        if m:
            backups.append((date(int(m[1]), int(m[2]), int(m[3])), a))
    backups.sort(key=lambda x: x[0], reverse=True)
    manter = {a["id"] for _, a in backups[:diarios]}
    hoje = date.today()
    limite = (hoje.year * 12 + hoje.month - 1) - (meses - 1)
    primeiros = {}
    for dia, a in sorted(backups, key=lambda x: x[0]):
        if dia.year * 12 + dia.month - 1 >= limite:
            primeiros.setdefault((dia.year, dia.month), a["id"])
    manter |= set(primeiros.values())
    apagados = 0
    for _, a in backups:
        if a["id"] not in manter:
            lixeira(drive, a["id"])
            apagados += 1
    print(f"retenção: {len(backups) - apagados} mantidos, {apagados} para a lixeira")


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    comando = sys.argv[1]
    drive, pasta = servico(), os.environ["GDRIVE_FOLDER_ID"]
    if comando == "existe":
        existe(drive, pasta, sys.argv[2])
    elif comando == "enviar":
        enviar(drive, pasta, sys.argv[2])
    elif comando == "retencao":
        retencao(drive, pasta, int(sys.argv[2]), int(sys.argv[3]))
    else:
        sys.exit(f"comando desconhecido: {comando}")


if __name__ == "__main__":
    main()
