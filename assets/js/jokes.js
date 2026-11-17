/* SHITTOWN — jokes.js
   Every written word in this town. Crude, dumb, and entirely fictional. */
(function () {
  const ST = (window.ST = window.ST || {});
  const J = (ST.jokes = {});

  J.ranks = [
    { name: "LOSER", need: 0 },
    { name: "NOBODY", need: 150 },
    { name: "MENACE", need: 500 },
    { name: "SCUMBAG", need: 1200 },
    { name: "DEGENERATE", need: 2500 },
    { name: "LEGEND OF SHITTOWN", need: 5000 }
  ];

  J.tips = [
    "Tip: everything that isn't bolted down can be thrown. Everything that is bolted down can be unbolted with enough violence.",
    "Tip: the claw works on people too. They hate that. You'll love it.",
    "Tip: beer makes you punch harder and aim like a guy with one eye. That's the deal.",
    "Tip: pee puts out fires. This is the only useful thing you will do all day.",
    "Tip: the slot machine pays out. Sometimes. Legally, it never does.",
    "Tip: witnesses call the cops. Witnesses can also be introduced to a chair.",
    "Tip: break a window, feel nothing. That's the Shittown way.",
    "Tip: cigarettes are a health item. We asked a doctor. He left.",
    "Tip: if a cop is filming you, that's a different thing. Run.",
    "Tip: propane tanks are basically fireworks with a grudge.",
    "Tip: bartenders respect exact change and absolutely nothing else.",
    "Tip: the strip club has a two-drink minimum and a zero-dignity maximum.",
    "Tip: you cannot die of embarrassment here. We tested it on Gary.",
    "Tip: throwing money at dancers raises Respect. Throwing chairs raises it faster.",
    "Tip: there is no plot. There is only you, the town, and the insurance claim.",
    "Tip: pressing R is not a bug. It is a feature. Please stop emailing us."
  ];

  J.tips.push("Tip: weed is legal in Kentucky. The police have chosen not to accept this.",
    "Tip: secondhand smoke is a great way to make friends, enemies, and a coughing chorus.",
    "Tip: cars are real. Press E near one. E gets you out. W gets you in trouble.",
    "Tip: rednecks know every shortcut in town. Most of them are through your yard.",
    "Tip: the town has a water tower. It has never held water. It holds opinions.");

  J.evil = [
    "Nice shoes. Give me five dollars.",
    "You look like you vote.",
    "I hope your car explodes.",
    "This town was better when you were asleep.",
    "I'm not saying you're ugly, but my dog left.",
    "You got a phone? I got a rock.",
    "Keep walking before I get creative.",
    "Nobody likes you. I asked everybody.",
    "I'm gonna tell my cousin about you.",
    "You smell like a bad decision and gasoline."
  ];

  J.bootWarnings = [
    "By clicking ENTER you agree that Shittown is not responsible for your choices, your record, or your posture.",
    "No portals. No princesses. No personal growth. Just a town and a bad idea.",
    "The citizens of Shittown are fictional. The urge to throw a mailbox is not."
  ];

  J.deathTips = [
    "You died as you lived: loudly, and near a dumpster.",
    "The hospital has a loyalty card. This was your fifth visit. One more and you get a free X-ray.",
    "Pro tip: cops have guns. You have a bottle. Do the math.",
    "You were doing so well for almost nine seconds.",
    "The town will remember you. The town will not remember you.",
    "Your last words were 'watch this'. They were not watching.",
    "Somewhere, a slot machine is laughing.",
    "You have died. Your Respect has been donated to a guy named Dale."
  ];

  J.ticker = {
    punch: ["+{n} RESPECT — that's assault, buddy.", "+{n} RESPECT — he felt that in his ancestors.", "+{n} RESPECT — cheap shot, great form.", "+{n} RESPECT — the town applauds quietly."],
    ko: ["+{n} RESPECT — {name} is taking a nap.", "+{n} RESPECT — {name} has left the chat.", "+{n} RESPECT — {name} is now furniture.", "+{n} RESPECT — {name} will be fine. Probably."],
    copko: ["+{n} RESPECT — you dropped a cop. Bold.", "+{n} RESPECT — Internal Affairs sends their regards.", "+{n} RESPECT — that's a lot of paperwork for someone."],
    window: ["+{n} RESPECT — glass is a liquid, and now it's a floor.", "+{n} RESPECT — the window had a family.", "+{n} RESPECT — seven years bad luck, zero years of caring."],
    explosion: ["+{n} RESPECT — the propane tank has been avenged.", "+{n} RESPECT — someone's insurance premium just doubled.", "+{n} RESPECT — that was art."],
    fire: ["The fire department has been notified. They are not coming.", "Local arson enthusiast spotted near the scene.", "That's a lot of fire. Respect."],
    drink: ["Beer: breakfast of champions, lunch of Shittown.", "You feel sophisticated and also extremely wobbly.", "The bartender nods. That's the closest thing to love here."],
    pee: ["You have marked your territory. The territory is a wall.", "Hydration is important.", "Somewhere a fire is relieved."],
    slotwin: ["+${n} — the machine respects you now.", "+${n} — the house is having a bad day.", "+${n} — please spend it on something stupid."],
    jackpot: ["JACKPOT! The casino would like a word. And some cops.", "JACKPOT! Nobody has ever won this before. Nobody will again.", "JACKPOT! You are legally required to leave now."],
    rankup: ["You are now {rank}. Nobody is proud."],
    crime: ["Witnesses are calling the cops. Rude.", "Someone shouted 'not in my town!' — you're in their town.", "A phone is being dialed. Slowly. Dramatically."],
    wanted: ["The cops are aware of you now.", "More cops. They brought friends and a bad attitude.", "This is escalating. Keep going."],
    calm: ["The heat is dying down. Gross.", "The cops went back to eating donuts. You're free."],
    bribe: ["The cop took the money and left. This town works."]
  };

  J.dudeMelee = [
    "And that's why you don't talk to strangers.",
    "It's a beautiful day in Shittown.",
    "I'm the last honest man in this town.",
    "That one's for my therapist.",
    "I really should have stayed home.",
    "Violence is never the answer. It's the question, and the answer is yes.",
    "Somebody's getting a bill for this."
  ];

  J.stonedLines = [
    "The sidewalk is breathing.",
    "I'm not high, the town is just extremely low-poly.",
    "Do you think the pigeons know?",
    "I could fight a cop. I could also be a cop. Life is a circle.",
    "Everything smells like nachos and regret.",
    "I have become one with the dumpster.",
    "If I close one eye, the mall looks successful.",
    "I'm gonna invent a sandwich. Don't tell anyone.",
    "Time is a construct. So is my probation."
  ];

  J.phonePosts = [
    { who: "@SHITTOWN_SCANNER", body: "Officers responding to reports of a man yelling at a mailbox. Again." },
    { who: "@MALL_GOTH_99", body: "the escalator is still broken. this is my 9/11" },
    { who: "@DAVE_420", body: "new strain dropped. it's called 'Landlord's Notice'. $15 a bag." },
    { who: "@POPs_CHICKEN", body: "8 piece bucket $9. biscuits $2. dignity not sold here." },
    { who: "@KAREN_WATCH", body: "I saw a man pee on a hydrant. I have it on video. I have it on THREE videos." },
    { who: "@SHITTOWN_HOA", body: "Reminder: lawn care is mandatory. So is minding your own business." },
    { who: "@SLICK_DADDY", body: "if you gotta ask the price, you can't afford the compliment." },
    { who: "@BROKE_BOY_DS", body: "found a DS in the mall fountain. it still works. it only has snake." },
    { who: "@MALL_SECURITY", body: "To the gentleman throwing pretzels: we know who you are. We have always known." },
    { who: "@TOWN_CRYER", body: "Local man achieves nothing, again. Town proud." },
    { who: "@WEINER_SCHNITZEL", body: "Today only: sausage, fries, and a small soda for $5. The soda is warm." },
    { who: "@CUTS_AND_BLOOD", body: "Walk-ins welcome. Bleeding? Bring a friend." },
    { who: "@SHITTOWN_MALL", body: "We are 80% vacant and 100% still here. The fountain is dry. The vibes are not." },
    { who: "@GARY_OFFICIAL", body: "Stop calling me. I'm not that Gary." },
    { who: "@SHITCOIN_CEO", body: "SHITCOIN up 400% today. Down 600% tomorrow. This is financial advice." },
    { who: "@LIVVY_LIVE", body: "just filmed a guy punch a mailbox. engagement is INSANE. link in bio." },
    { who: "@HOA_WATCH", body: "Reminder: vape clouds count as fog. We are watching." },
    { who: "@LANDLORD_LARRY", body: "Rent is due. Also the building is condemned. Also I raised rent." },
    { who: "@BOBA_BOY", body: "brown sugar boba $6. the ice is extra. the vibes are free." }
  ];

  J.crackedChats = [
    { name: "SLICK (PIMP)", msg: "You got my money?", replies: ["I got potential.", "Define money.", "I got a chicken."] },
    { name: "DAVE (420 DEPOT)", msg: "come thru. bring $15 and no cops.", replies: ["Define 'cops'.", "On my way.", "I'm already outside. I'm always outside."] },
    { name: "MOM", msg: "Are you drinking again?", replies: ["Define 'again'.", "It's medicinal.", "I'm doing great, Mom."] },
    { name: "UNKNOWN +1 (555) 0199", msg: "we know what you did at the mall", replies: ["I did nothing.", "Which mall?", "That was a different guy."] },
    { name: "DALE", msg: "bro im outside the bar. where r u", replies: ["I'm inside the bar.", "I'm the bar.", "Wrong Dale."] },
    { name: "MALL SECURITY", msg: "You are banned from the food court.", replies: ["I'm not even there.", "Worth it.", "Which food court?"] },
    { name: "GARY", msg: "do not come to the mall today", replies: ["Why?", "I'm already at the mall.", "Who is this?"] }
  ];

  J.extraBarks = {
    redneck: [
      "That's my cousin's truck. We're engaged.",
      "I don't smoke weed, I just smell it professionally.",
      "Put that out, I got a job interview at the feed store.",
      "You ain't from around here. I can tell 'cause you got all your teeth.",
      "Weed's legal. Cops just ain't read the memo.",
      "I can fix that. Probably. Give me a wrench and a minute.",
      "My other car is also this car.",
      "Don't go past the water tower. That's where the Hendersons are."
    ],
    pimp: [
      "You got style, champ. Stupid style.",
      "I got people. You got a chicken. We are not the same.",
      "Don't touch the suit. The suit is union.",
      "You wanna make money? Stop throwing it at dancers.",
      "This town is a gold mine if you don't mind the smell."
    ],
    tweaker: [
      "The pigeons are federal.",
      "I haven't blinked since 2009 and I'm fine.",
      "You're a texture. I can see the seams.",
      "The mall is a spaceship. The pretzels are the controls.",
      "They put something in the fountain. I drank it. I'm faster now."
    ],
    security: [
      "I'm mall security. I have a flashlight and a dream.",
      "Keep moving, champ.",
      "You can't be here. I can't be here. Nobody can be here.",
      "I'm not a real cop. I'm mall security. There's a difference.",
      "The escalator is closed. So is my heart."
    ],
    mallrat: [
      "This mall used to have a Sam Goody.",
      "I've been here since the food court closed.",
      "The escalator is haunted.",
      "You got a phone charger? No? Cool. Cool cool cool.",
      "I'm not loitering, I'm curating."
    ],
    weedclerk: [
      "It's medicinal. For the town.",
      "Don't tell the cop outside.",
      "That's the good shit. Probably.",
      "We also sell bongs. And questionable advice.",
      "Cash only. Vibes accepted."
    ],
    wiener: [
      "Ein Wiener, bitte.",
      "The sausage is older than the mall. It's fine.",
      "No refunds. No exceptions. No dignity."
    ],
    chicken: [
      "Biscuits are extra.",
      "The chicken is fried. So is the cook.",
      "Eight pieces. Eight reasons to live.",
      "Pop's Chicken: we don't ask what happened."
    ],
    barber: [
      "I only know one haircut. It's this one.",
      "You want a fade? I can fade your whole life.",
      "Ten dollars. No crying.",
      "I've been cutting hair since the mall was nice."
    ]
  };

  J.barks = {
    ped: [
      "Nice weather for a crime wave.",
      "I'm calling the cops! Right after this text.",
      "This used to be a nice neighborhood. Then you moved in.",
      "Sir, that's a mailbox. Sir. SIR.",
      "I have pepper spray and a podcast.",
      "You're on camera! Somewhere! Probably!",
      "I know a guy who knows a guy.",
      "Is this performance art?",
      "I was going to the gym anyway.",
      "I'm not insured for this!"
    ],
    drunk: [
      "I could fight you. I won't. But I could.",
      "Hey. Hey. You. You're my best friend.",
      "I'm not drunk, I'm just thinning my blood.",
      "One more beer and I'm a changed man.",
      "You seen my car? It's the one that's not mine.",
      "I'm on a diet. Of beer.",
      "Money is a construct, man. Buy me one."
    ],
    cop: [
      "Freeze! You're under arrest for being an idiot.",
      "Drop the bottle! Drop the chair! Drop the— is that a toilet?",
      "You have the right to remain quiet. You will not use it.",
      "I'm getting too old for this town.",
      "Stop resisting! You're not even resisting!",
      "Suspect is armed with a chair and bad ideas.",
      "Shit, my body cam is off.",
      "Another Tuesday, another guy throwing a mailbox."
    ],
    karen: [
      "I'M FILMING THIS!",
      "This is going on Nextdoor!",
      "Do you know who my husband's lawyer is?",
      "I want to speak to the manager of this town!",
      "You are aggressing my property values!",
      "I have three kids and a podcast!",
      "TWENTY YEARS OF DECORUM IN THIS TOWN!"
    ],
    bouncer: [
      "That's enough, champ.",
      "You're cut off. From outside. The whole outside.",
      "Hey! Hey! We don't do that here.",
      "You want to fight me? I get paid for this.",
      "Take it to the alley. That's where we do it."
    ],
    dancer: [
      "Money first, feelings never.",
      "You're not allowed to touch the glitter.",
      "Security! The enthusiastic one is back.",
      "Dollar bills only. No coins.",
      "You look like you've had a week.",
      "This is the highlight of both our lives."
    ],
    bartender: [
      "You've had enough, buddy.",
      "That's eight dollars. No, I don't take teeth.",
      "I've seen things in this bar, and I've only worked here two days.",
      "Drink it slowly. Or don't. What do I care?",
      "You want a tab? Your tab is a threat to my mortgage."
    ],
    bum: [
      "Spare change for a guy with a dream?",
      "I'm not homeless, I'm outside-oriented.",
      "You got a beer? Not for me. For my dog. I don't have a dog.",
      "This alley is my office.",
      "I used to be somebody. Now I'm a guy in an alley."
    ]
  };

  Object.assign(J.barks, J.extraBarks);
  J.extraBarks.influencer = [
    "This is going on my story.",
    "I'm not filming you, I'm documenting the vibe.",
    "Say something controversial. For the algorithm.",
    "I have 4,000 followers. 3,000 are bots. It's still a community.",
    "Link in bio.",
    "This town is so authentic. I hate it."
  ];
  J.extraBarks.cryptobro = [
    "Shitcoin is going to the moon. Trust me.",
    "It's not a scam, it's a community.",
    "I'm not selling, I'm taking profits.",
    "Have you heard of passive income?",
    "Diamond hands, champ.",
    "The market is down, which means it's up."
  ];
  J.extraBarks.geeker = [
    "I'm just resting my eyes.",
    "You got a dollar? Or a straw?",
    "This road is my bed now.",
    "I saw God. He looked like a pigeon.",
    "Don't touch my foil.",
    "I'm not high, I'm horizontal.",
    "Five more minutes. Five more years.",
    "The sidewalk is breathing."
  ];
  J.extraBarks.partygoer = [
    "WOOO!",
    "This is the best night of my life. I say that every night.",
    "I'm not drunk, I'm just passionate.",
    "Who brought the chicken?",
    "One more shot and I'm calling my ex.",
    "The DJ is my therapist.",
    "I've been dancing since Tuesday."
  ];
  J.extraBarks.dealer = [
    "I sell confidence. And other things.",
    "No refunds. No witnesses. No names.",
    "You look like a guy who needs a bag.",
    "The first one's full price. The second one's also full price.",
    "I don't know what that is. That's the beauty of it."
  ];
  J.extraBarks.delivery = [
    "Your food is getting cold. So is my soul.",
    "Five stars or I cry in the car.",
    "I'm an independent contractor. That means nobody loves me.",
    "The app says 3 minutes. The app is lying.",
    "Tip cash. The app takes 40%."
  ];

  J.barks.petitioner = [
    "Would you like to sign my petition?",
    "It's to ban video games in Shittown. For the children.",
    "Sir, this is a petition, not a conversation.",
    "You look like a man who cares about the community. You don't, but you look like it.",
    "Sign here. Or don't. I get paid either way.",
    "The clipboard is heavy because of all the hope."
  ];

  J.slotLines = {
    lose: ["The house thanks you for your donation.", "So close. Not really.", "That's how they get you.", "The reels spin. Your wallet doesn't.", "This is a business, not a charity."],
    win: ["Somebody tell the management!", "The machine whimpers.", "You feel rich. You are not.", "A small victory for degeneracy."],
    jackpot: ["JACKPOT! THE HOUSE IS CALLING THE COPS!", "JACKPOT! INEXPLICABLE!", "JACKPOT! SOMEBODY CHECK THE MACHINE!"],
    broke: "You don't have enough to play, champ."
  };

  J.stripLines = [
    "She takes the dollar and the last shred of your dignity.",
    "The DJ plays the same three seconds of song again.",
    "You are asked to stop throwing coins 'like that'.",
    "A bouncer watches you with the eyes of a disappointed father.",
    "The glitter gets everywhere. It will outlive you."
  ];

  J.radioNames = {
    street: "87.3 TOKYO RAIN · LO-FI CITY POP",
    bar: "90.1 SHINJUKU 3AM · LATE JAZZ",
    club: "96.5 SAKURA LOUNGE · DOWNTEMPO",
    heat: "102.7 ONI DRUMS · LOW TAIKO",
    casino: "108.1 PACHINKO DREAMS · BELL LOUNGE"
  };
})();
