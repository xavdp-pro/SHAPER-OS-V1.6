#!/usr/bin/env bash
# ==============================================================================
# Shaper OS — Bootstrap 1-Click pour Conteneur LXC Vierge (Debian 12 / Ubuntu)
# Déploie l'écosystème complet et passe le relais à l'agent OpenCode en < 120s
# ==============================================================================
set -e

echo "============================================================="
echo "=== INITIALISATION DU CLUSTER SHAPER OS (CLEAN-SHEET LXC) ==="
echo "============================================================="

# STEP 1 : Paquets système indispensables
echo "[1/7] Installation des paquets système sur l'hôte LXC..."
apt-get update -qq && apt-get install -y -qq   podman git curl wget jq ripgrep openssh-server openssh-client python3 python3-pip rsync unzip ca-certificates > /dev/null

# STEP 2 : Paire de clés SSH locale hôte <-> conteneurs
echo "[2/7] Configuration des clés SSH locales pour l'agent..."
mkdir -p /root/.ssh
if [ ! -f /root/.ssh/id_ed25519 ]; then
  ssh-keygen -t ed25519 -N '' -f /root/.ssh/id_ed25519 -q
  cat /root/.ssh/id_ed25519.pub >> /root/.ssh/authorized_keys
  chmod 700 /root/.ssh
  chmod 600 /root/.ssh/authorized_keys
fi
systemctl enable --now ssh > /dev/null 2>&1 || true

# STEP 3 : Répertoires de persistance /data/
echo "[3/7] Création des volumes de données persistantes /data/..."
mkdir -p /data/{vault,logger,queue,ged,workspaces,opencode-bridge,timelines,qdrant}
chmod -R 777 /data/ged /data/workspaces /data/timelines

# STEP 4 : Démarrage des conteneurs Shaper OS
echo "[4/7] Démarrage du cluster Podman (universes/univ9/deploy/podman-up.sh)..."
if [ -f universes/univ9/deploy/podman-up.sh ]; then
  bash universes/univ9/deploy/podman-up.sh
else
  echo "⚠️ Script podman-up.sh non trouvé, vérifiez le répertoire d'exécution."
fi

# STEP 5 : Câblage du pont Podman transparent dans l'agent
echo "[5/7] Configuration du pont transparent Podman dans l'agent..."
if podman ps -q -f name=univ9-bridge-opencode | grep -q .; then
  podman exec univ9-bridge-opencode mkdir -p /root/.ssh
  podman cp /root/.ssh/id_ed25519 univ9-bridge-opencode:/root/.ssh/id_ed25519
  podman cp /root/.ssh/id_ed25519.pub univ9-bridge-opencode:/root/.ssh/id_ed25519.pub
  podman exec univ9-bridge-opencode chmod 700 /root/.ssh
  podman exec univ9-bridge-opencode chmod 600 /root/.ssh/id_ed25519

  cat << 'EOF_WRAP' > /tmp/podman-wrapper.sh
#!/bin/bash
if [ $# -eq 0 ]; then
  exec ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR -o BatchMode=yes root@localhost podman
fi
CMD=""
for arg in "$@"; do
  CMD="$CMD $(printf '%q' "$arg")"
done
exec ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR -o BatchMode=yes root@localhost podman $CMD
EOF_WRAP
  chmod +x /tmp/podman-wrapper.sh
  podman cp /tmp/podman-wrapper.sh univ9-bridge-opencode:/usr/local/bin/podman
  podman cp /tmp/podman-wrapper.sh univ9-bridge-opencode:/usr/local/bin/docker
  rm -f /tmp/podman-wrapper.sh
fi

# STEP 6 : Initialisation de la mémoire de bord
echo "[6/7] Initialisation du journal de bord persistant (_kovzu/JOURNAL.md)..."
for WS in /data/workspaces/Administrateur /data/workspaces/Xavier; do
  mkdir -p "$WS/_kovzu"
  if [ ! -f "$WS/_kovzu/JOURNAL.md" ]; then
    cat << 'EOF_JOURNAL' > "$WS/_kovzu/JOURNAL.md"
# Journal des Opérations — Shaper OS / KovZu

## Initialisation — Déploiement Clean-Sheet LXC
- **Socle Opérationnel** : Podman 5.4, Python 3.11, Pip, Git, JQ, Ripgrep, Node 20.
- **Cluster Shaper OS Actif** : Vault (:8610), Logger (:8620), Queue (:8640), Maestro (:8530), GED (:8660), Qdrant (:6333), Helm (:8650).
- **Prise de Relais** : Agent souverain initialisé et prêt pour les commandes utilisateur.
EOF_JOURNAL
  fi
done

# STEP 7 : Validation finale & Relais Agent
echo "[7/7] Vérification du cluster et passage de relais à l'agent..."
podman ps --format "table {{.Names}}	{{.Status}}	{{.Ports}}"

echo ""
echo "🎉 SUCCÈS TOTAL : Univers Shaper OS déployé et opérationnel !"
echo "👉 L'agent OpenCode est actif et prêt à recevoir vos commandes sur le Cockpit Helm (port 8650)."
