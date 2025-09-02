
import { Document, Packer, Paragraph, HeadingLevel } from 'docx';

function normalize(x) {
  if (Array.isArray(x)) return x.map(normalize);
  if (x === null || x === undefined) return "";
  return String(x).trim().toLowerCase();
}

function scoreQ(candidate, key) {
  const pts = Number(key.points ?? 1.0);
  const correct = key.correct;
  const c = candidate;
  if (correct === undefined || correct === null) return 0.0;
  if (typeof correct === "string" && normalize(correct) === "libre") {
    return normalize(c) ? pts : 0.0;
  }
  if (typeof correct === "string" && ["a","b","c","d","v","f"].includes(normalize(correct))) {
    return normalize(c) === normalize(correct) ? pts : 0.0;
  }
  if (typeof correct === "string") {
    return normalize(c).includes(normalize(correct)) ? pts : 0.0;
  }
  if (Array.isArray(correct)) {
    const wanted = correct.map(normalize);
    if (Array.isArray(c)) {
      const got = c.map(normalize);
      const hits = wanted.filter(w => got.includes(w)).length;
      return wanted.length ? pts * (hits / wanted.length) : 0.0;
    } else {
      const got = normalize(c);
      const hits = wanted.filter(w => got.includes(w)).length;
      return wanted.length ? pts * (hits / wanted.length) : 0.0;
    }
  }
  return 0.0;
}

function computeScores(cfg) {
  const cle = cfg.cle || {};
  const rep = cfg.reponses || {};
  const scores = { CO: {}, CE: {}, PE: null };

  if (cle.CO && rep.CO) {
    let total = 0, bareme = 0;
    for (const ex of Object.keys(cle.CO)) {
      let st = 0, sb = 0;
      for (const item of cle.CO[ex]) {
        const q = item.q;
        sb += Number(item.points);
        const cand = rep.CO?.[ex]?.[q] ?? "";
        st += scoreQ(cand, item);
      }
      scores.CO[ex] = { points: Math.round(st*10)/10, bareme: Math.round(sb*10)/10 };
      total += st; bareme += sb;
    }
    scores.CO.TOTAL = { points: Math.round(total*10)/10, bareme: Math.round(bareme*10)/10 };
  }

  if (cle.CE && rep.CE) {
    let total = 0, bareme = 0;
    for (const ex of Object.keys(cle.CE)) {
      let st = 0, sb = 0;
      for (const item of cle.CE[ex]) {
        const q = item.q;
        sb += Number(item.points);
        const cand = rep.CE?.[ex]?.[q] ?? "";
        st += scoreQ(cand, item);
      }
      scores.CE[ex] = { points: Math.round(st*10)/10, bareme: Math.round(sb*10)/10 };
      total += st; bareme += sb;
    }
    scores.CE.TOTAL = { points: Math.round(total*10)/10, bareme: Math.round(bareme*10)/10 };
  }

  if (cfg.pe) {
    const pe = cfg.pe;
    const total = Object.values(pe).map(Number).reduce((a,b)=>a+b, 0);
    scores.PE = { detail: pe, total: Math.round(total*10)/10, bareme: 25.0 };
  }

  return scores;
}

function levelEstimate(niveau, scores) {
  if ((niveau || "").toUpperCase() === "B2") {
    return ["B1 haut (CO sous B2, PO non cotée)","CE B2 / PE B1– → écrit global B1"];
  }
  return ["B1 (CO B1+, PO non cotée)","CE B1 / PE B1– (≈ A2+) → écrit global B1–"];
}

async function makeDocx(cfg, scores) {
  const niveau = (cfg.niveau || "").toUpperCase();
  const sujet = cfg.sujet ?? "?";
  const nom = cfg.meta?.nom_candidat || "Candidat";

  const co = scores.CO?.TOTAL || { points: 0, bareme: 25 };
  const ce = scores.CE?.TOTAL || { points: 0, bareme: 25 };
  const pe = scores.PE || null;
  const total = co.points + ce.points + (pe?.total || 0);
  const [oral, ecrit] = levelEstimate(niveau, scores);

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ text: `Commentaires – DELF ${niveau} (Sujet ${sujet}) — ${nom}`, heading: HeadingLevel.TITLE }),
        new Paragraph({ text: "Estimation globale", heading: HeadingLevel.HEADING_2 }),
        new Paragraph(`• Moyenne (hors PO) : ${total.toFixed(1)}/75 – profil contrasté.`),
        new Paragraph(niveau === "B2"
          ? "• Objectif période suivante : consolider les inférences en CO et la grammaire/cohésion en PE pour stabiliser un B2.1 net."
          : "• Objectif période suivante : consolider la morphosyntaxe et la cohésion en PE ; affiner les inférences en CO/CE."
        ),
        new Paragraph(`• Niveau oral / niveau écrit : Oral global provisoire = ${oral} ; Écrit = ${ecrit}.`),

        new Paragraph({ text: `Compréhension orale ${niveau} — Observations`, heading: HeadingLevel.HEADING_2 }),
        new Paragraph(`Score : ${co.points}/${co.bareme}. Repérage des informations explicites correct ; difficulté sur les inférences et la sélection d’indices.`),
        new Paragraph("• Case à cocher (objectif global) : En cours d’acquisition."),
        new Paragraph("• Pistes : prise de notes en 3 colonnes (Idée clé / Indices / Conclusion), justification mot-clé + repère."),

        new Paragraph({ text: `Compréhension des écrits ${niveau} — Observations`, heading: HeadingLevel.HEADING_2 }),
        new Paragraph(`Score : ${ce.points}/${ce.bareme}. Bonne lecture globale ; vigilance sur V/F et catégorisation Fait / Effet / Mesure.`),
        new Paragraph("• Case à cocher (objectif global) : À l’aise et efficace."),
        new Paragraph("• Pistes : preuve courte (guillemets + ligne) pour chaque réponse."),

        new Paragraph({ text: `Production écrite ${niveau} — Observations`, heading: HeadingLevel.HEADING_2 }),
        new Paragraph(pe ? `Score : ${pe.total}/25. Tâche respectée ; limites en cohésion et morphosyntaxe.` : "Non fournie : à compléter si vous avez les critères (5×5)."),
        new Paragraph("• Pistes : modèle 3 paragraphes, 8–10 connecteurs écrits ; prioriser accords/temps ; relecture ponctuation."),

        new Paragraph({ text: `Production orale ${niveau} — Observations`, heading: HeadingLevel.HEADING_2 }),
        new Paragraph("Non évaluée sur cette session ; estimation à confirmer à la prochaine PO."),
        new Paragraph("• Pistes : plan 1-2-1, annonces de plan/transitions ; hypothèses et nuance."),

        new Paragraph({ text: "Synthèse « réseau » (2–3 lignes)", heading: HeadingLevel.HEADING_2 }),
        new Paragraph(niveau === "B2"
          ? "Lecture B2 solide ; écoute et rédaction encore instables au niveau B2. Objectif B2.1 réaliste à court terme en travaillant CO (inférences) et PE (grammaire + connecteurs/ponctuation)."
          : "Réceptions au niveau B1. Écriture en-dessous du B1. Objectif : stabiliser la PE au B1 et renforcer les inférences en CO/CE."
        ),
      ]
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer.toString('base64');
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Méthode non autorisée" });
    }
    const cfg = req.body || {};
    const scores = computeScores(cfg);
    const b64 = await makeDocx(cfg, scores);
    const nom = cfg.meta?.nom_candidat || "Candidat";
    const niveau = (cfg.niveau || "").toUpperCase();

    return res.status(200).json({
      scores: {
        CO: scores.CO,
        CE: scores.CE,
        PE: scores.PE,
        total_hors_PO: (scores.CO?.TOTAL?.points || 0) + (scores.CE?.TOTAL?.points || 0) + (scores.PE?.total || 0)
      },
      documents: {
        commentaires_filename: `Commentaires_DELF_${niveau}_${nom}.docx`,
        commentaires_docx_base64: b64
      }
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e) });
  }
}
