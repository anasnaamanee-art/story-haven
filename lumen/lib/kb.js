/**
 * Base de connaissances embarquée (fiches scolaires francophones).
 * Sert de socle factuel hors ligne : définition, points clés, exemple, pièges.
 * Volontairement compacte et vérifiée ; complétée par la recherche web si activée.
 */

export const KB = [
  {
    id: 'photosynthese',
    keys: ['photosynthese', 'photosynthétique', 'chlorophylle', 'plante verte', 'chloroplaste'],
    title: 'La photosynthèse',
    domain: 'Sciences de la vie',
    definition:
      "La photosynthèse est le processus par lequel les végétaux chlorophylliens fabriquent de la matière organique (glucose) à partir d'eau, de dioxyde de carbone et de lumière. C'est la conversion d'énergie lumineuse en énergie chimique.",
    points: [
      "Elle se déroule dans les **chloroplastes**, organites contenant la **chlorophylle** (pigment vert qui capte la lumière).",
      "Deux phases : les **réactions photochimiques** (dans les thylakoïdes) qui produisent ATP et NADPH, puis le **cycle de Calvin** (dans le stroma) qui fixe le CO₂ et fabrique le glucose.",
      "Équation bilan : **6 CO₂ + 6 H₂O + lumière → C₆H₁₂O₆ + 6 O₂**.",
      "L'oxygène rejeté provient de l'eau, pas du CO₂ — point souvent mal compris.",
    ],
    example:
      "Une feuille placée à l'ombre fabrique moins de glucose : la lumière est le facteur limitant. À l'inverse, en serre enrichie en CO₂, le rendement augmente.",
    pitfalls: [
      "Confondre photosynthèse (fabrication de matière) et respiration (dégradation) : ce sont deux processus distincts, souvent inverses.",
      "Croire que les plantes ne respirent pas : elles respirent aussi, jour et nuit.",
    ],
  },
  {
    id: 'respiration',
    keys: ['respiration cellulaire', 'mitochondrie', 'atp', 'glycolyse'],
    title: 'La respiration cellulaire',
    domain: 'Sciences de la vie',
    definition:
      "La respiration cellulaire est l'ensemble des réactions qui dégradent le glucose en présence de dioxygène pour produire de l'ATP, la molécule d'énergie utilisable par la cellule.",
    points: [
      "Elle a lieu principalement dans les **mitochondries**.",
      "Équation bilan : **C₆H₁₂O₆ + 6 O₂ → 6 CO₂ + 6 H₂O + énergie (ATP)**.",
      "Trois étapes : glycolyse, cycle de Krebs, chaîne respiratoire (phosphorylation oxydative).",
      "Le rendement est bien supérieur à la fermentation anaérobie.",
    ],
    example: "Un muscle en effort intense manque d'oxygène : il passe à la fermentation lactique, d'où les crampes.",
    pitfalls: ["La respiration cellulaire n'est pas la « respiration » pulmonaire : l'une est chimique, l'autre mécanique."],
  },
  {
    id: 'adn',
    keys: ['adn', 'arn', 'gene', 'génome', 'chromosome', 'hérédité', 'double hélice'],
    title: "L'ADN et l'information génétique",
    domain: 'Sciences de la vie',
    definition:
      "L'ADN (acide désoxyribonucléique) est une molécule en double hélice qui porte l'information génétique. Un gène est une portion d'ADN codant une protéine ou un caractère.",
    points: [
      "Quatre bases : A, T, G, C — l'adénine s'apparie avec la thymine, la guanine avec la cytosine.",
      "L'ensemble de l'ADN d'une cellule constitue le **génome** ; chez l'humain, il est réparti sur 46 chromosomes (23 paires).",
      "La **transcription** copie l'ADN en ARN messager, la **traduction** convertit cet ARN en protéine.",
      "Les mutations modifient la séquence : elles peuvent être neutres, délétères ou favorables — base de l'évolution.",
    ],
    example: "La drépanocytose résulte d'une seule lettre modifiée dans le gène de l'hémoglobine.",
    pitfalls: ["Un gène ne « commande » pas un caractère seul : l'expression dépend aussi de l'environnement."],
  },
  {
    id: 'revolution',
    keys: ['revolution francaise', '1789', 'bastille', 'louis xvi', 'ancien regime', 'etats generaux', 'terreur'],
    title: 'La Révolution française (1789-1799)',
    domain: 'Histoire',
    definition:
      "La Révolution française est une période de bouleversement politique et social qui met fin à la monarchie absolue et à la société d'ordres, et fonde une société de citoyens égaux devant la loi.",
    points: [
      "**Causes** : crise financière de l'État, mauvaises récoltes, idées des Lumières, inégalités entre clergé, noblesse et tiers état.",
      "**1789** : États généraux, serment du Jeu de paume, prise de la Bastille (14 juillet), Déclaration des droits de l'homme et du citoyen.",
      "**1791** : première Constitution, monarchie constitutionnelle.",
      "**1793-1794** : exécution de Louis XVI, la Terreur, puis réaction thermidorienne.",
      "**1799** : coup d'État de Bonaparte, fin de la Révolution.",
    ],
    example: "L'abolition de la féodalité dans la nuit du 4 août 1789 supprime les privilèges : c'est une rupture juridique, pas seulement symbolique.",
    pitfalls: [
      "La Révolution n'est pas un bloc : 1789, 1793 et 1799 sont des moments très différents.",
      "Ne pas confondre Déclaration des droits (1789) et Constitution (1791).",
    ],
  },
  {
    id: 'guerre14',
    keys: ['premiere guerre mondiale', '1914', 'guerre 14-18', 'versailles 1919', 'tranchee'],
    title: 'La Première Guerre mondiale (1914-1918)',
    domain: 'Histoire',
    definition:
      "Conflit mondial déclenché par l'attentat de Sarajevo, qui oppose les Alliés (France, Royaume-Uni, Russie puis États-Unis) aux Empires centraux (Allemagne, Autriche-Hongrie).",
    points: [
      "**Causes** : nationalismes, course aux armements, système d'alliances, rivalités coloniales.",
      "**Guerre de position** : tranchées, artillerie, batailles d'usure (Verdun, la Somme).",
      "**Guerre totale** : mobilisation économique, propagande, rôle des femmes dans les usines.",
      "**Traité de Versailles (1919)** : responsabilité allemande, réparations, pertes territoriales — humiliation qui nourrira la Seconde Guerre.",
    ],
    example: "Verdun (1916) : environ 300 000 morts en dix mois pour un front presque inchangé — symbole de la guerre d'usure.",
    pitfalls: ["Ce n'est pas seulement une guerre européenne : les colonies fournissent soldats et matières premières."],
  },
  {
    id: 'guerre39',
    keys: ['seconde guerre mondiale', '1939', '1945', 'shoah', 'resist ance', 'debarquement', 'hitler'],
    title: 'La Seconde Guerre mondiale (1939-1945)',
    domain: 'Histoire',
    definition:
      "Conflit planétaire opposant les Alliés (Royaume-Uni, URSS, États-Unis, France libre) à l'Axe (Allemagne nazie, Italie, Japon), marqué par la Shoah et l'usage de l'arme nucléaire.",
    points: [
      "**1939-1941** : victoires de l'Axe, défaite française (1940), invasion de l'URSS.",
      "**1942-1943** : tournant (Stalingrad, El-Alamein, Midway).",
      "**1944-1945** : débarquement en Normandie, libération, capitulation allemande (8 mai 1945) et japonaise (2 septembre).",
      "**Shoah** : génocide de six millions de Juifs, organisé par le régime nazi avec une bureaucratie industrielle.",
    ],
    example: "Le débarquement du 6 juin 1944 ouvre un second front à l'Ouest, soulageant l'URSS à l'Est.",
    pitfalls: ["La Résistance n'est pas uniquement militaire : renseignement, sauvetage, presse clandestine, refus administratif."],
  },
  {
    id: 'pythagore',
    keys: ['pythagore', 'hypotenuse', 'triangle rectangle', 'theoreme de pythagore', 'formule de pythagore', 'a2 + b2'],
    title: 'Le théorème de Pythagore',
    domain: 'Mathématiques',
    definition:
      "Dans un triangle rectangle, le carré de la longueur de l'hypoténuse est égal à la somme des carrés des longueurs des deux autres côtés : **a² + b² = c²**.",
    points: [
      "Valable **uniquement** dans un triangle rectangle.",
      "Sert à calculer une longueur inconnue, ou à démontrer qu'un triangle est (ou n'est pas) rectangle.",
      "Réciproque : si a² + b² = c², alors le triangle est rectangle en C.",
      "Les triplets pythagoriciens les plus courants : (3, 4, 5), (5, 12, 13), (6, 8, 10).",
    ],
    example: "Triangle de côtés 3 et 4 : c² = 9 + 16 = 25, donc l'hypoténuse mesure 5.",
    pitfalls: ["Appliquer le théorème sans vérifier l'angle droit.", "Confondre hypoténuse (le plus grand côté) et côté adjacent."],
  },
  {
    id: 'thales',
    keys: ['thales', 'theoreme de thales', 'droites paralleles'],
    title: 'Le théorème de Thalès',
    domain: 'Mathématiques',
    definition:
      "Si deux droites sécantes sont coupées par deux droites parallèles, alors les rapports de longueur des segments correspondants sont égaux (configuration « triangles emboîtés »).",
    points: [
      "Configuration nécessaire : deux droites **parallèles**.",
      "Permet de calculer une longueur inconnue ou de prouver un parallélisme (réciproque).",
      "À distinguer de Pythagore, qui concerne les angles droits.",
    ],
    example: "Une ombre de 2 m pour un bâton de 1 m permet de trouver la hauteur d'un arbre mesurant une ombre de 8 m : h = 4 m.",
    pitfalls: ["Écrire les rapports dans le mauvais ordre : toujours partir du même sommet."],
  },
  {
    id: 'premiers',
    keys: ['nombre premier', 'nombres premiers', 'divisibilité', 'crible eratosthene', 'nombre pair'],
    title: 'Les nombres premiers',
    domain: 'Mathématiques',
    definition:
      "Un nombre premier est un entier naturel strictement supérieur à 1 qui n'admet que deux diviseurs : 1 et lui-même.",
    points: [
      "Les premiers : 2, 3, 5, 7, 11, 13, 17, 19, 23…",
      "**2 est le seul nombre premier pair.**",
      "1 n'est pas premier (un seul diviseur).",
      "Tout entier > 1 se décompose de façon unique en produit de facteurs premiers — base de la cryptographie RSA.",
    ],
    example: "84 = 2² × 3 × 7. Cette écriture sert à simplifier des fractions ou à trouver un PGCD.",
    pitfalls: ["Utiliser la primalité sans tester les diviseurs jusqu'à √n seulement (inutile d'aller plus loin)."],
  },
  {
    id: 'derivee',
    keys: ['derivee', 'derivation', 'limite', 'taux de variation', 'tangente'],
    title: 'La dérivée',
    domain: 'Mathématiques',
    definition:
      "La dérivée d'une fonction mesure sa vitesse de variation : c'est la pente de la tangente à la courbe en un point.",
    points: [
      "Définition : f'(a) = lim (f(a+h) − f(a)) / h quand h → 0.",
      "Signe de f' → sens de variation de f : f' > 0 ⇒ f croissante.",
      "f'(x) = 0 avec changement de signe ⇒ extremum local.",
      "Formules de base : (xⁿ)' = n·xⁿ⁻¹, (eˣ)' = eˣ, (ln x)' = 1/x, (u·v)' = u'v + uv'.",
    ],
    example: "f(x) = x² donne f'(x) = 2x : la pente vaut 6 en x = 3, et la fonction est décroissante avant 0, croissante après.",
    pitfalls: ["Confondre f(a) et f'(a) : l'un est une valeur, l'autre une pente."],
  },
  {
    id: 'proba',
    keys: ['probabilite', 'probabilites', 'hasard', 'esperance', 'loi binomiale'],
    title: 'Les probabilités',
    domain: 'Mathématiques',
    definition:
      "La probabilité mesure la chance qu'un événement se produise : nombre de cas favorables divisé par nombre de cas possibles (équiprobabilité).",
    points: [
      "0 ≤ P(A) ≤ 1 ; P(univers) = 1 ; P(non A) = 1 − P(A).",
      "P(A ∪ B) = P(A) + P(B) − P(A ∩ B).",
      "Indépendance : P(A ∩ B) = P(A) × P(B).",
      "Probabilité conditionnelle : P(A|B) = P(A ∩ B) / P(B).",
    ],
    example: "Deux dés : P(somme = 7) = 6/36 = 1/6, car six combinaisons donnent 7.",
    pitfalls: ["Confondre « indépendant » et « incompatible » : deux événements incompatibles ne sont jamais indépendants (sauf probabilité nulle)."],
  },
  {
    id: 'pourcentage',
    keys: ['pourcentage', 'proportion', 'taux de variation', 'augmentation', 'remise'],
    title: 'Les pourcentages',
    domain: 'Mathématiques',
    definition: "Un pourcentage est une proportion exprimée sur une base de 100 : 15 % signifie 15 pour cent, soit 15/100 = 0,15.",
    points: [
      "Calculer p % de N : N × p / 100.",
      "Augmenter de t % : multiplier par (1 + t/100) ; diminuer : (1 − t/100).",
      "Une hausse de 20 % suivie d'une baisse de 20 % ne revient **pas** au point de départ (× 1,2 × 0,8 = 0,96 → −4 %).",
      "Taux de variation : (valeur finale − valeur initiale) / valeur initiale × 100.",
    ],
    example: "Un article à 80 € avec −25 % coûte 60 € : 80 × 0,75 = 60.",
    pitfalls: ["Additionner deux pourcentages qui ne portent pas sur la même base."],
  },
  {
    id: 'gravite',
    keys: ['gravite', 'pesanteur', 'newton', 'chute libre', 'poids et masse'],
    title: 'La gravitation',
    domain: 'Physique-Chimie',
    definition:
      "La gravitation est l'attraction mutuelle entre deux corps possédant une masse : F = G × m₁ × m₂ / d².",
    points: [
      "G ≈ 6,67 × 10⁻¹¹ N·m²/kg².",
      "La force diminue avec le **carré** de la distance.",
      "Poids P = m × g (en newtons) ; la masse (kg) ne change pas, le poids dépend du lieu.",
      "g ≈ 9,81 N/kg sur Terre, ≈ 1,6 sur la Lune.",
    ],
    example: "Un objet de 10 kg pèse environ 98 N sur Terre et 16 N sur la Lune.",
    pitfalls: ["Confondre masse et poids dans les unités (kg vs N)."],
  },
  {
    id: 'energie',
    keys: ['energie renouvelable', 'energie solaire', 'eolien', 'energie', 'joule', 'puissance'],
    title: "L'énergie et ses formes",
    domain: 'Physique-Chimie',
    definition:
      "L'énergie est la capacité d'un système à produire un travail, un mouvement ou de la chaleur. Elle se conserve : elle se transforme, ne disparaît pas.",
    points: [
      "Formes : cinétique (½mv²), potentielle (mgh), thermique, chimique, électrique, nucléaire, rayonnante.",
      "Unité : le **joule** (J) ; puissance en **watts** (W) : E = P × t.",
      "Renouvelables : solaire, éolien, hydraulique, biomasse, géothermie.",
      "Fossiles : charbon, pétrole, gaz — non renouvelables, émetteurs de CO₂.",
    ],
    example: "Une ampoule de 10 W allumée 5 h consomme 50 Wh, soit 0,05 kWh.",
    pitfalls: ["Confondre énergie (kWh) et puissance (kW) : la puissance est un débit d'énergie."],
  },
  {
    id: 'climat',
    keys: ['effet de serre', 'changement climatique', 'rechauffement', 'co2', 'gaz a effet de serre'],
    title: "L'effet de serre et le changement climatique",
    domain: 'Géographie',
    definition:
      "L'effet de serre est un phénomène naturel : certains gaz retiennent une partie du rayonnement infrarouge émis par la Terre, maintenant une température moyenne d'environ 15 °C.",
    points: [
      "Gaz principaux : vapeur d'eau, CO₂, méthane, protoxyde d'azote, ozone.",
      "L'activité humaine (combustion fossile, agriculture, déforestation) augmente leur concentration.",
      "Conséquence : hausse de la température moyenne, fonte des glaces, élévation du niveau des mers, événements extrêmes.",
      "Le climat est une moyenne sur 30 ans ; la météo décrit un état à court terme.",
    ],
    example: "La concentration de CO₂ est passée d'environ 280 ppm avant l'ère industrielle à plus de 420 ppm aujourd'hui.",
    pitfalls: ["Confondre météo et climat.", "Confondre ozone (pollution locale) et effet de serre (bilan radiatif global)."],
  },
  {
    id: 'mondialisation',
    keys: ['mondialisation', 'globalisation', 'echanges mondiaux', 'firmes transnationales'],
    title: 'La mondialisation',
    domain: 'Géographie',
    definition:
      "La mondialisation est l'intensification des échanges de biens, services, capitaux, informations et personnes à l'échelle planétaire.",
    points: [
      "Facteurs : baisse des coûts de transport et de communication, libéralisation des échanges.",
      "Acteurs : firmes transnationales, États, organisations internationales, ONG, individus connectés.",
      "Effets : spécialisation productive, croissance, mais aussi inégalités territoriales et concurrence sociale.",
      "Mégapoles et façades maritimes concentrent les flux.",
    ],
    example: "Un smartphone est conçu dans un pays, éclaté en composants fabriqués dans plusieurs autres, assemblé dans un troisième : c'est une chaîne de valeur mondiale.",
    pitfalls: ["Réduire la mondialisation à l'économie : elle est aussi culturelle et politique."],
  },
  {
    id: 'democratie',
    keys: ['democratie', 'republique', 'separation des pouvoirs', 'constitution', 'etat de droit'],
    title: 'La démocratie',
    domain: 'Économie & droit',
    definition:
      "La démocratie est un régime politique où le pouvoir appartient au peuple, exercé par des représentants élus ou par participation directe, sous garantie de droits fondamentaux.",
    points: [
      "Séparation des pouvoirs (Montesquieu) : législatif, exécutif, judiciaire.",
      "État de droit : la loi s'applique à tous, y compris aux gouvernants.",
      "Mécanismes : élections libres, pluralisme, liberté d'expression et de presse, alternance.",
      "Distinctions : démocratie directe, représentative, participative.",
    ],
    example: "L'article 1er de la Constitution française : « La France est une République indivisible, laïque, démocratique et sociale. »",
    pitfalls: ["Confondre république et démocratie : une république peut ne pas être démocratique."],
  },
  {
    id: 'libert_e',
    keys: ['liberte', 'determinisme', 'libre arbitre', 'sartre', 'philosophie morale'],
    title: 'La liberté (philosophie)',
    domain: 'Philosophie',
    definition:
      "La liberté désigne la capacité d'agir selon sa propre volonté, sans contrainte extérieure. En philosophie, elle oppose souvent « liberté négative » (absence d'entrave) et « liberté positive » (pouvoir d'agir, autonomie).",
    points: [
      "**Descartes** : la volonté est libre, mais le jugement doit être éclairé pour éviter l'erreur.",
      "**Sartre** : « l'homme est condamné à être libre » — la liberté est responsabilité.",
      "**Spinoza** : le libre arbitre est une illusion ; on est libre quand on comprend ce qui nous détermine.",
      "Distinction utile : faire ce qu'on veut (caprice) vs vouloir ce que l'on fait (autonomie).",
    ],
    example: "Choisir ses études par soi-même est un acte libre, même si le contexte social influence ce choix : liberté et déterminisme ne s'excluent pas totalement.",
    pitfalls: ["Confondre liberté et absence de règles : la loi peut rendre libre (protéger du plus fort)."],
  },
  {
    id: 'ia',
    keys: ['intelligence artificielle', 'machine learning', 'apprentissage automatique', 'reseau de neurones', 'ia generative'],
    title: "L'intelligence artificielle",
    domain: 'Informatique',
    definition:
      "L'intelligence artificielle regroupe les techniques permettant à une machine de réaliser des tâches qui demandent normalement l'intelligence humaine : percevoir, raisonner, décider, produire du langage.",
    points: [
      "**Machine learning** : sous-domaine où la machine apprend à partir de données au lieu d'être programmée règle par règle.",
      "**Apprentissage supervisé / non supervisé / par renforcement**.",
      "**Réseaux de neurones profonds** (deep learning) : couches successives de transformations, performants en vision et langage.",
      "**IA générative** : modèles qui produisent texte, image, son ; ils prédisent des enchaînements plausibles, sans « comprendre ».",
      "Enjeux : biais des données, coût énergétique, transparence, propriété des données.",
    ],
    example: "Un filtre anti-spam supervisé apprend à partir d'e-mails étiquetés « spam / non spam » — il généralise à des messages nouveaux.",
    pitfalls: ["Dire qu'une IA « pense » ou « sait » : elle calcule des probabilités, elle ne comprend pas le sens."],
  },
  {
    id: 'internet',
    keys: ['internet', 'web', 'protocole', 'reseaux', 'http'],
    title: 'Internet et le Web',
    domain: 'Informatique',
    definition:
      "Internet est un réseau mondial de réseaux qui échangent des données grâce au protocole IP. Le Web est un service d'Internet fondé sur HTTP et HTML.",
    points: [
      "TCP/IP découpe l'information en paquets, les achemine, puis les réassemble.",
      "Le **Web** (pages, liens) n'est pas **Internet** (infrastructure) : le Web est l'un de ses usages.",
      "HTTPS chiffre les échanges ; DNS traduit les noms de domaine en adresses IP.",
      "Architecture client-serveur ; les navigateurs interprètent HTML, CSS, JavaScript.",
    ],
    example: "Taper une adresse déclenche une requête DNS, une connexion TCP, une requête HTTP, puis le rendu de la page.",
    pitfalls: ["Confondre Internet et Web.", "Croire que le mode privé rend invisible : il ne supprime pas la traçabilité côté fournisseur."],
  },
  {
    id: 'systeme-solaire',
    keys: ['systeme solaire', 'planete', 'soleil', 'lune', 'saison'],
    title: 'Le système solaire',
    domain: 'Physique-Chimie',
    definition:
      "Le système solaire est l'ensemble formé par le Soleil et les corps qui gravitent autour de lui : huit planètes, leurs satellites, astéroïdes, comètes.",
    points: [
      "Ordre : Mercure, Vénus, Terre, Mars (telluriques), Jupiter, Saturne, Uranus, Neptune (gazeuses/glacées).",
      "Les saisons viennent de l'**inclinaison de l'axe** terrestre (23,4°), pas de la distance au Soleil.",
      "Une année = un tour autour du Soleil ; un jour = une rotation sur soi-même.",
      "La Lune provoque les marées par son attraction.",
    ],
    example: "En juillet, l'hémisphère Nord est incliné vers le Soleil : c'est l'été, alors que la Terre est la plus éloignée du Soleil.",
    pitfalls: ["Expliquer les saisons par la distance au Soleil : c'est faux."],
  },
  {
    id: 'ciel-bleu',
    keys: ['ciel bleu', 'diffusion rayleigh', 'couleur du ciel', 'pourquoi le ciel'],
    title: 'Pourquoi le ciel est bleu',
    domain: 'Physique-Chimie',
    definition:
      "Le ciel paraît bleu parce que les molécules de l'atmosphère diffusent préférentiellement les courtes longueurs d'onde de la lumière solaire — c'est la diffusion de Rayleigh.",
    points: [
      "La lumière blanche contient toutes les couleurs ; l'atmosphère diffuse le bleu (λ courte) environ **10 fois plus** que le rouge.",
      "L'intensité diffusée varie comme **1/λ⁴** : plus la longueur d'onde est courte, plus la diffusion est forte.",
      "Au coucher du soleil, la lumière traverse une plus grande épaisseur d'atmosphère : le bleu est diffusé hors du trajet et il reste le rouge/orange.",
      "Le violet est encore plus diffusé que le bleu, mais l'œil y est moins sensible et une partie est absorbée.",
    ],
    example: "Dans un verre d'eau avec quelques gouttes de lait, éclairez latéralement : la lumière diffusée paraît bleutée — même mécanisme.",
    pitfalls: ["Ce n'est pas le reflet des océans.", "L'ozone et les particules jouent un rôle secondaire, la diffusion moléculaire est le facteur principal."],
  },
  {
    id: 'cycle-eau',
    keys: ['cycle de l eau', 'evaporation', 'condensation', 'precipitations', 'cycle de l eau'],
    title: "Le cycle de l'eau",
    domain: 'Géographie',
    definition:
      "Le cycle de l'eau décrit le circuit continu de l'eau entre océans, atmosphère et continents : évaporation, condensation, précipitations, ruissellement, infiltration.",
    points: [
      "L'énergie du Soleil alimente l'évaporation ; la gravité fait redescendre l'eau.",
      "Étapes : évaporation → condensation (nuages) → précipitations → ruissellement / infiltration.",
      "L'eau douce disponible représente une très faible part de l'eau totale.",
      "Le cycle régule le climat et conditionne les écosystèmes.",
    ],
    example: "Un nuage se forme quand l'air chaud et humide refroidit : la vapeur se condense en gouttelettes.",
    pitfalls: ["Croire que l'eau « disparaît » en s'évaporant : elle change d'état."],
  },
  {
    id: 'subjonctif',
    keys: ['subjonctif', 'conjugaison', 'mode', 'grammaire francaise'],
    title: 'Le subjonctif',
    domain: 'Français & littérature',
    definition:
      "Le subjonctif est un mode exprimant le souhait, le doute, l'obligation, l'émotion ou une action envisagée — souvent après « que ».",
    points: [
      "Déclencheurs : il faut que, bien que, avant que, pour que, je veux que, je doute que…",
      "Formation : radical de la 3ᵉ personne du pluriel du présent + -e, -es, -e, -ions, -iez, -ent.",
      "Exceptions fréquentes : être (que je sois), avoir (que j'aie), aller (que j'aille), faire (que je fasse).",
      "**Après « après que », on emploie l'indicatif** (règle souvent mal appliquée).",
    ],
    example: "« Il faut que tu **viennes** » et non « que tu viens ». Mais « après que tu es venu » (indicatif).",
    pitfalls: ["Mettre du subjonctif après « après que ».", "Oublier l'accent : « qu'il ait » ≠ « qu'il est »."],
  },
  {
    id: 'dissertation',
    keys: ['dissertation', 'commentaire compose', 'plan dialectique', 'introduction conclusion'],
    title: 'La dissertation',
    domain: 'Français & littérature',
    definition:
      "La dissertation est un exercice argumentatif : analyser un sujet, construire une démonstration organisée, et y répondre par une thèse défendue avec des exemples.",
    points: [
      "**Introduction** : accroche, définition des termes, problématique, annonce du plan.",
      "**Développement** : plan dialectique (thèse / antithèse / synthèse) ou thématique (2-3 axes).",
      "**Conclusion** : réponse à la problématique + ouverture (sans nouvelle idée).",
      "Chaque paragraphe : idée → argument → exemple → analyse de l'exemple.",
    ],
    example: "Sur « la liberté est-elle une illusion ? », le plan dialectique confronte le sentiment de liberté puis les déterminismes, avant de proposer une synthèse sur la liberté comme conscience des déterminismes.",
    pitfalls: ["Le catalogue d'exemples sans argument.", "Une problématique trop large (« la liberté » et non « la liberté est-elle une illusion ? »)."],
  },
  {
    id: 'introduction',
    keys: ['introduction', 'accroche', 'problematique', 'annonce du plan'],
    title: "L'introduction d'un devoir",
    domain: 'Français & littérature',
    definition:
      "L'introduction prépare le lecteur : elle amène le sujet, le délimite, formule la question à laquelle le devoir répond et annonce la démarche.",
    points: [
      "**Accroche** : fait, citation, contexte — puis lien avec le sujet.",
      "**Définition des termes** : délimiter, éviter les contresens.",
      "**Problématique** : une question précise, à laquelle on peut répondre.",
      "**Annonce du plan** : sans numéroter (« dans un premier temps… puis… »).",
      "Longueur : environ 10-15 % du devoir.",
    ],
    example: "Accroche → « En 1789, la Déclaration des droits proclame que les hommes naissent libres… » puis problématique et annonce.",
    pitfalls: ["Annoncer un plan que le devoir ne suit pas.", "Poser une question fermée (oui/non) sans enjeu."],
  },
  {
    id: 'sommeil',
    keys: ['sommeil', 'memoire', 'apprentissage', 'concentration', 'revision efficace'],
    title: 'Apprendre et mémoriser',
    domain: 'Santé & bien-être',
    definition:
      "Mémoriser durablement repose sur l'encodage actif, la répétition espacée et la consolidation pendant le sommeil — pas sur la relecture passive.",
    points: [
      "**Rappel actif** : se tester est bien plus efficace que relire (effet de test).",
      "**Répétition espacée** : revoir à intervalles croissants (J+1, J+3, J+7, J+21).",
      "**Interleaving** : alterner les types d'exercices plutôt que bloquer sur un seul.",
      "**Sommeil** : la consolidation mémorielle a lieu pendant le sommeil profond et paradoxal.",
      "**Charge cognitive** : découper l'information en unités plus petites (chunking).",
    ],
    example: "Relire un cours trois fois donne une impression de maîtrise ; se tester une fois sans notes révèle les vraies lacunes.",
    pitfalls: ["Confondre familiarité (je reconnais) et maîtrise (je restitue)."],
  },
  {
    id: 'recherche-emploi',
    keys: ['cv', 'curriculum vitae', 'entretien d embauche', 'lettre de motivation', 'candidature'],
    title: 'Chercher un stage ou un emploi',
    domain: 'Orientation & études',
    definition:
      "La candidature convaincante relie une offre précise, des preuves de compétences et un projet cohérent — CV, lettre et entretien forment un même discours.",
    points: [
      "**CV** : une page, informations hiérarchisées, verbes d'action, résultats chiffrés.",
      "**Lettre** : un argument principal, illustré par une expérience concrète.",
      "**Entretien** : préparez 3 exemples (méthode STAR : Situation, Tâche, Action, Résultat).",
      "**Réseau** : la plupart des offres se pourvoient avant publication ; contactez directement.",
      "Relisez : une faute d'orthographe disqualifie souvent avant le contenu.",
    ],
    example: "« J'ai organisé un événement de 300 personnes avec 2 000 € de budget » est plus convaincant que « bon sens de l'organisation ».",
    pitfalls: ["Envoyer le même CV partout sans adapter les mots-clés de l'offre."],
  },
];

/** Recherche dans la base embarquée */
export function kbFind(query = '') {
  const n = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, ' ');
  const scored = [];
  for (const e of KB) {
    let score = 0;
    for (const k of e.keys) {
      const kk = k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, ' ');
      if (n.includes(kk)) score += kk.split(' ').length * 2 + kk.length / 10;
    }
    const titleNorm = e.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    for (const w of titleNorm.split(/\s+/)) if (w.length > 4 && n.includes(w)) score += 0.5;
    if (score > 0) scored.push({ entry: e, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.entry || null;
}
