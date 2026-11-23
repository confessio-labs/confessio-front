// Answers use a minimal markup, rendered by FaqAnswer: blocks are separated by
// a blank line; a block is a heading ("## "), a bulleted list ("- " lines), a
// numbered list ("1. " lines) or a paragraph whose line breaks are kept.
// Texts are the team's brief, kept as written until the copy review.

export type FaqEntry = {
  id: string;
  question: string;
  answer: string;
};

export const FAQ: FaqEntry[] = [
  {
    id: "revenir",
    question:
      "Cela fait longtemps que je ne fréquente plus l'Église : puis-je revenir ?",
    answer:
      "Tu es l'enfant bien aimé du Seigneur. Dieu t'attend, viens à Lui dans la paix.\n\n« C'est ainsi qu'il y aura de la joie dans le ciel pour un seul pécheur qui se convertit, plus que pour quatre-vingt-dix-neuf justes qui n'ont pas besoin de conversion. » (Lc 15, 7)",
  },
  {
    id: "preparer",
    question: "Faut-il préparer ma confession ?",
    answer:
      "Pour une bonne confession, il est conseillé de prendre un temps de préparation personnel avant de rencontrer le prêtre.\n\nIl s'agit d'un temps de prière et de vérité devant Dieu pour examiner mes pensées, mes paroles, mes actes et mes omissions (c'est-à-dire le bien que j'aurais pu faire mais que je n'ai pas fait).\n\nConfesser mes péchés, c'est avouer avec regret, sincèrement et humblement mes péchés.\n\nSans chercher à dresser une liste parfaite de mes imperfections, je cherche avant tout à préparer mon cœur à recevoir la miséricorde.\n\n## Quelques pistes pour me préparer à recevoir le sacrement du Pardon\n\n1. Je demande à l'Esprit Saint d'éclairer ma conscience et de voir mon péché (🔗prières en lien)\n2. Je prends quelques instants pour relire ma vie à la lumière de la Parole et repérer les péchés commis.\n\n- Je peux méditer un passage d'évangile (🔗textes bibliques en lien), les 10 commandements (🔗YOUCAT_ManuelDeConfession_FR.pdf), les béatitudes, les péchés capitaux, les œuvres de miséricorde… (🔗textes en lien)\n- Je peux m'aider d'un examen de conscience, selon mon âge ou mon état de vie, qui identifie des exemples de péchés commis contre Dieu, contre les autres ou contre moi-même. (🔗lien vers examen de conscience)\n- Je peux vivre une retraite en ligne de 3 jours, via un parcours « Se préparer au sacrement de réconciliation » proposé par Hozana (🔗 Se préparer au sacrement de réconciliation - Hozana)\n\n3. Je termine en m'interrogeant : Est-ce que je reconnais sincèrement mes péchés ? Est-ce que je les regrette vraiment ? Est-ce que je désire changer avec l'aide de Dieu ?\n\nLa durée d'une confession normale est d'environ 5 à 10 minutes. Je prévois d'être succinct, tout en avouant les péchés mortels et le nombre de fois où nous les avons commis.\n\nL'attente au confessionnal peut être le temps que Dieu me donne pour rendre mon cœur disponible, relire notre préparation et prier pour mon frère baptisé et le prêtre qui célèbrent déjà ce sacrement.",
  },
  {
    id: "ou-et-quand",
    question: "Où et quand me confesser près de chez moi ?",
    answer:
      "Je consulte les horaires et lieux grâce au moteur de recherche Confessio.\n\nPlus de 1200 lieux en France, paroisses, sanctuaires et communautés proposent tout au long de l'année des créneaux ouverts pour célébrer le sacrement de réconciliation. Il est aussi possible de solliciter directement un rendez-vous à un prêtre.\n\nDans les « Repères pour se confesser », la Conférence des évêques de France (CEF) rappelle le cadre requis pour la célébration du sacrement de réconciliation, notamment :\n\n- un lieu, qui permet que le sacrement soit célébré de manière visible et qui ne doit jamais être un lieu privé ou d'intimité du prêtre (domicile, chambre ou autre).\n- la faculté d'un prêtre d'entendre les confessions, qui est mentionnée et consultable sur le celebret (carte d'identification et de celebret délivrée par l'autorité ecclésiastique) (🔗 Accéder au service Celebret)",
  },
  {
    id: "frequence",
    question: "À quelle fréquence me confesser ?",
    answer:
      "L'Église demande aux fidèles de confesser leurs péchés graves au moins une fois par an.\n\nMais elle encourage la confession régulière (au rythme de 4 à 6 semaines par exemple). Une confession trop rare risque de m'éloigner de Dieu. Une confession trop fréquente, motivée par l'inquiétude peut engendrer des scrupules.\n\nUn bref examen de conscience quotidien peut m'accompagner, afin qu'entre deux confessions, je reste et grandisse dans la lumière et l'amour de Dieu.\n\nLa couleur violette de l'étole que porte le prêtre laisse à croire que ce sacrement est réservé aux temps du Carême ou de l'Avent. Non, le sacrement de réconciliation ou de pénitence est donné tout au long de l'année, aux baptisés, comme un sacrement de guérison et de conversion. Il m'aide à lutter contre le péché et mes mauvaises habitudes. Et n'oublions pas : par le pardon reçu, j'apprends à donner le pardon. Alors dans notre vie de baptisé, ne nous privons pas de recevoir les fruits de ce sacrement : 70 fois 7 fois sans compter !",
  },
  {
    id: "etapes",
    question: "Comment me confesser, étape par étape ?",
    answer:
      "La rencontre avec le prêtre pour célébrer le sacrement de réconciliation dure en moyenne 5 à 10 minutes.\n\nOn peut identifier 4 temps importants : l'accueil, la confession, la contrition et l'absolution. Le déroulement peut légèrement varier d'un prêtre à l'autre.\n\n## Accueil\n\nLe prêtre : Au nom du Père, et du Fils, et du Saint-Esprit. Amen.\nMoi, le baptisé : Bénissez-moi, mon Père, parce que j'ai péché.\n\nJe me présente brièvement, et en particulier dit son état de vie.\nMa dernière confession remonte à…\nJe m'accuse avec regret des péchés suivants…\n(Il dit mes péchés succinctement)\n\nPuis, dans une brève exhortation, le prêtre te donne des conseils et notamment la pénitence. Cet acte qui vient réparer le mal comis (acte de charité ou prière).\n\nC'est maintenant que je prononce ou lis à haute voix, l'acte de contrition.\n\n## Acte de contrition\n\nMoi, le baptisé :\nMon Dieu, j'ai un très grand regret de vous avoir offensé, car vous êtes infiniment bon, infiniment aimable, et que le péché vous déplaît. Je prends la ferme résolution, avec le secours de votre sainte grâce, de ne plus vous offenser et de faire pénitence.\n\nOu bien :\nMon Dieu, j'ai péché contre toi et envers mes frères. Mais près de toi se trouve le pardon. Accueille mon repentir, et donne-moi la force de vivre selon ton amour.\n\n## Absolution\n\nC'est le cœur du sacrement, le signe sacramentel. J'écoute maintenant les paroles de pardon, cette prière du prêtre qu'il dit en imposant les mains.\n\nLe prêtre :\nQue Dieu notre Père vous montre sa miséricorde. Par la mort et la résurrection de son Fils, il a réconcilié le monde avec lui, et il a envoyé l'Esprit Saint pour la rémission des péchés. Par le ministère de l'Église, qu'il vous donne le pardon et la paix, et moi, au nom du Père, et du Fils, et du Saint-Esprit, je vous pardonne tous vos péchés.\nMoi, le baptisé : Amen.\n\n## Envoi\n\nLe prêtre : Allez dans la paix et la joie du Christ.\n\nJe suis réconciliée, je pars rendre grâce et accomplir la pénitence reçue, sur ce chemin nouveau de vie. C'est le 5ème temps pour que tout soit accompli et que les grâces du sacrement fructifient dans ma vie.",
  },
  {
    id: "apres",
    question: "Et après la confession ?",
    answer:
      "Me voici réconcilié(e) ! Je rends grâce pour le pardon reçu, avec par exemple le Magnificat (🔗lien du texte) (Luc 1, 46-55).\n\nLe prêtre a pu me proposer une pénitence (acte de charité, prioère…). Cette pénitence est un cadeau qui répare le mal commis. Je redis à Dieu mon désir de Le suivre, de ne plus s'éloigner de son Amour et m'engager dans une vie nouvelle.\n\nPour m'appliquer à entrer dans cette démarche, je peux mettre en place des actions concrètes pour manifester ce choix :\n\n- Prier davantage : prier la Vierge Marie de ne m'habituer même aux petits péchés, prier mon ange gardien qu'il guide mes pas, …\n- Ou encore vivre une retraite en ligne « Faire fructifier les grâces reçues en confession » proposée par Hozana (🔗 Faire fructifier les grâces reçues en confession - Hozana)",
  },
];
