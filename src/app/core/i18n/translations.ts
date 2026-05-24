export const SUPPORTED_LANGUAGES = ['en', 'ar'] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number];

export type TranslationTree = {
  [key: string]: string | TranslationTree;
};

export const TRANSLATIONS: Record<LanguageCode, TranslationTree> = {
  en: {
    common: {
      brand: 'Sudoku Rival',
      home: 'Home',
      play: 'Play',
      playNow: 'Play Now',
      howToPlay: 'How To Play',
      leaderboard: 'Leaderboard',
      settings: 'Settings',
      privacy: 'Privacy Policy',
      terms: 'Terms of Service',
      signIn: 'Sign in',
      signUp: 'Sign up',
      logIn: 'Log in',
      close: 'Close',
      menu: 'Menu',
      notifications: 'Notifications',
      wallet: 'Wallet',
      shop: 'Shop',
      buy: 'Buy',
      buyCoins: 'Buy coins',
      coins: 'coins',
      profile: 'Profile',
      admin: 'Admin',
      solo: 'Solo',
      signOut: 'Sign out',
      view: 'View',
      dismiss: 'Dismiss',
      enabled: 'Enabled',
      disabled: 'Disabled',
      light: 'Light',
      dark: 'Dark',
      system: 'System',
      save: 'Save',
      cancel: 'Cancel',
      account: 'Account',
      guest: 'Guest',
      email: 'Email',
      password: 'Password',
      english: 'English',
      arabic: 'Arabic',
    },
    nav: {
      toggle: 'Toggle navigation',
      close: 'Close navigation',
      openAccount: 'Open account menu',
      language: 'Language',
      switchToEnglish: 'Switch to English',
      switchToArabic: 'Switch to Arabic',
      settings: 'Settings',
    },
    home: {
      kicker: 'Real-time multiplayer Sudoku',
      titleLine1: 'The Ultimate',
      titleLine2: 'Sudoku',
      titleAccent: 'Battle',
      description:
        'Compete in real-time Sudoku matches against players worldwide. Fast thinking, sharp strategy, and precision decide the winner.',
      learnMore: 'Learn More',
      liveMatch: 'Live Match',
      gameCode: 'Game #R7X9',
      rivalName: 'Nader',
      you: 'You',
      versus: 'VS',
      mistakes: 'Mistakes: 2 / 10',
      topPlayers: 'Top Players',
      viewFullLeaderboard: 'View Full Leaderboard',
      team: 'Team',
      builtBy: 'Built by Sudoku Rival Games',
      footerTagline: 'Think sharp. Compete hard. Be the rival.',
      game: 'Game',
      community: 'Community',
      tournaments: 'Tournaments',
      about: 'About',
      contact: 'Contact',
      followUs: 'Follow Us',
      copyright: '© {{ year }} Sudoku Rival Games. All rights reserved.',
      howToIntro: 'Sudoku Rival',
      howToSteps: {
        one: 'Create or join a room.',
        two: 'Solve the same puzzle faster than your rival.',
        three: 'Avoid mistakes to prevent freeze penalties.',
        four: 'First valid board wins the match.',
      },
      actions: {
        pause: 'Pause',
        giveUp: 'Give Up',
        notes: 'Notes',
        erase: 'Erase',
        undo: 'Undo',
        hint: 'Hint',
      },
      features: {
        realtime: {
          kicker: 'Realtime',
          title: 'Real-Time Matches',
          description: 'Play live against real opponents and feel the pressure every move.',
        },
        fairPlay: {
          kicker: 'Fair Play',
          title: 'Fair Play System',
          description: 'Balanced matchmaking and anti-cheat logic keep competitions clean.',
        },
        ranked: {
          kicker: 'Ranked',
          title: 'Global Leaderboard',
          description: 'Earn points, stack wins, and climb to the top worldwide.',
        },
        penalty: {
          kicker: 'Penalty',
          title: 'Smart Penalties',
          description: 'Mistakes trigger freeze windows that reward precision over luck.',
        },
      },
      teamMember: {
        role: 'Founder & Full-Stack Engineer',
        bio: 'Owns the core product direction, realtime architecture, and match logic quality.',
      },
    },
    play: {
      kicker: 'Solo Practice',
      title: 'Play Sudoku Online',
      description:
        'Start a fast Sudoku board online, sharpen your logic, and prepare for live multiplayer challenges.',
      filled: 'Filled:',
      controls: 'Controls',
      practiceTitle: 'Practice Run',
      practiceSubtitle: 'Sharpen speed and accuracy before entering multiplayer.',
      generating: 'Generating puzzle...',
      delete: 'Del',
      numberHighlight: 'Number highlight',
      errorCheck: 'Error check',
      resetBoard: 'Reset board',
      goMultiplayer: 'Go multiplayer',
      on: 'On',
      off: 'Off',
      greatRun: 'Great run. Start a new puzzle or jump into multiplayer.',
      share: 'Share',
      copy: 'Copy',
      playAgain: 'Play again',
      enterMultiplayer: 'Enter multiplayer arena',
      solved: 'Puzzle solved',
      complete: 'Sudoku Complete',
    },
    game: {
      empty: 'empty',
      cellLabel: 'Cell {{ index }}, value {{ value }}',
    },
    howToPlay: {
      kicker: 'Sudoku rules',
      title: 'How to Play Sudoku',
      subtitle:
        'Learn the classic Sudoku rules, then bring them into online Sudoku challenges and multiplayer Sudoku rooms.',
      basicsTitle: 'Sudoku basics',
      basics:
        'Fill every empty cell with a number from 1 to 9. Each row, column, and 3x3 box must contain every number once.',
      onlineTitle: 'Online Sudoku on Sudoku Rival',
      online:
        'Choose solo practice for quick training, or sign in to create rooms and challenge friends in real-time matches.',
      challengeTitle: 'Multiplayer challenge rules',
      challenge:
        'Everyone solves the same puzzle. Correct answers increase progress, while wrong answers can trigger penalties in live rooms.',
      tipsTitle: 'Useful tips',
      tipsOne: 'Scan rows, columns, and boxes before guessing.',
      tipsTwo: 'Use obvious singles first to unlock harder sections.',
      tipsThree: 'In multiplayer Sudoku, accuracy is often faster than risky guesses.',
      cta: 'Start Playing',
    },
    privacy: {
      kicker: 'Legal',
      title: 'Privacy Policy',
      intro:
        'Sudoku Rival collects only the information needed to run accounts, multiplayer rooms, leaderboards, payments, and safety features.',
      dataTitle: 'Information we use',
      data:
        'Account details, gameplay progress, wallet activity, notifications, and support information may be processed to provide the service.',
      securityTitle: 'Security',
      security:
        'Authentication, database access, and account data are handled through the existing secure app integrations and access rules.',
      choicesTitle: 'Your choices',
      choices:
        'You can use Settings to control visual preferences, language, sounds, notifications, and game options stored on this device.',
    },
    terms: {
      kicker: 'Legal',
      title: 'Terms of Service',
      intro:
        'By using Sudoku Rival, you agree to play fairly, respect other players, and follow the rules of the platform.',
      playTitle: 'Fair play',
      play:
        'Do not exploit bugs, automate gameplay, harass players, or attempt to manipulate rooms, wallets, purchases, or leaderboards.',
      accountsTitle: 'Accounts and purchases',
      accounts:
        'You are responsible for your account activity. Manual purchase confirmations are reviewed before coins are credited.',
      availabilityTitle: 'Availability',
      availability:
        'Sudoku Rival may change features, rules, or availability to improve reliability, safety, and gameplay balance.',
    },
    settings: {
      kicker: 'Preferences',
      title: 'Sudoku Rival Settings',
      subtitle:
        'Customize language, theme, sound, notifications, and game preferences for this device.',
      language: {
        title: 'Language',
        description: 'The URL remains the source of truth, while your choice is saved as a preference.',
        english: 'English',
        arabic: 'Arabic',
      },
      theme: {
        title: 'Theme',
        description: 'Choose the global color mode used across Sudoku Rival.',
        light: 'Light mode',
        dark: 'Dark mode',
      },
      sound: {
        title: 'Sound',
        description: 'Control game sounds for future game events.',
        enabled: 'Game sounds',
      },
      notifications: {
        title: 'Notifications',
        description: 'Browser permission is requested only when you enable notifications.',
        enabled: 'Notifications',
        unsupported: 'Browser notifications are not available in this environment.',
        denied: 'Notifications are blocked in your browser settings.',
      },
      gamePreferences: {
        title: 'Game preferences',
        description: 'Save board behavior preferences for solo and future game screens.',
        showMistakes: 'Show mistakes',
        highlightDuplicates: 'Highlight duplicates',
        autoCheck: 'Auto-check answers',
        timer: 'Timer',
      },
      account: {
        title: 'Account',
        signedInAs: 'Signed in as {{ name }}',
        login: 'Sign in',
        register: 'Create account',
        logout: 'Log out',
        profile: 'Open profile',
        guestMessage: 'Sign in to manage profile, wallet, rooms, and match history.',
      },
    },
    seo: {
      siteName: 'Sudoku Rival',
      home: {
        title: 'Sudoku Rival - Play Sudoku Online',
        description:
          'Play Sudoku online, challenge your friends, and improve your puzzle skills with Sudoku Rival.',
      },
      play: {
        title: 'Play Sudoku Online - Sudoku Rival',
        description:
          'Play Sudoku online in solo practice or join real-time multiplayer Sudoku challenges with Sudoku Rival.',
      },
      howToPlay: {
        title: 'How to Play Sudoku - Rules and Online Challenges',
        description:
          'Learn how to play Sudoku, understand Sudoku rules, and start online or multiplayer Sudoku challenges with Sudoku Rival.',
      },
      settings: {
        title: 'Sudoku Rival Settings - Customize Your Game',
        description:
          'Customize your Sudoku Rival experience, including language, theme, sound, notifications, and game preferences.',
      },
      privacy: {
        title: 'Privacy Policy - Sudoku Rival',
        description:
          'Read the Sudoku Rival privacy policy for account, gameplay, notification, and preference data.',
      },
      terms: {
        title: 'Terms of Service - Sudoku Rival',
        description:
          'Read the Sudoku Rival terms of service for fair play, accounts, purchases, and platform rules.',
      },
      leaderboard: {
        title: 'Sudoku Leaderboard - Sudoku Rival',
        description: 'View Sudoku Rival rankings, wins, win rate, and coin performance.',
      },
      default: {
        title: 'Sudoku Rival',
        description:
          'Play Sudoku online, challenge rivals, and improve your puzzle skills with Sudoku Rival.',
      },
    },
    errors: {
      pageNotFound: 'Page not found',
      returnHome: 'Return home',
    },
  },
  ar: {
    common: {
      brand: 'Sudoku Rival',
      home: 'الرئيسية',
      play: 'العب',
      playNow: 'العب الآن',
      howToPlay: 'طريقة اللعب',
      leaderboard: 'لوحة الصدارة',
      settings: 'الإعدادات',
      privacy: 'سياسة الخصوصية',
      terms: 'شروط الخدمة',
      signIn: 'تسجيل الدخول',
      signUp: 'إنشاء حساب',
      logIn: 'دخول',
      close: 'إغلاق',
      menu: 'القائمة',
      notifications: 'الإشعارات',
      wallet: 'المحفظة',
      shop: 'المتجر',
      buy: 'شراء',
      buyCoins: 'شراء عملات',
      coins: 'عملة',
      profile: 'الملف الشخصي',
      admin: 'الإدارة',
      solo: 'تدريب فردي',
      signOut: 'تسجيل الخروج',
      view: 'عرض',
      dismiss: 'إخفاء',
      enabled: 'مفعل',
      disabled: 'غير مفعل',
      light: 'فاتح',
      dark: 'داكن',
      system: 'النظام',
      save: 'حفظ',
      cancel: 'إلغاء',
      account: 'الحساب',
      guest: 'زائر',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      english: 'الإنجليزية',
      arabic: 'العربية',
    },
    nav: {
      toggle: 'فتح أو إغلاق التنقل',
      close: 'إغلاق التنقل',
      openAccount: 'فتح قائمة الحساب',
      language: 'اللغة',
      switchToEnglish: 'التحويل إلى الإنجليزية',
      switchToArabic: 'التحويل إلى العربية',
      settings: 'الإعدادات',
    },
    home: {
      kicker: 'سودوكو جماعي مباشر',
      titleLine1: 'تحدي',
      titleLine2: 'سودوكو',
      titleAccent: 'الأقوى',
      description:
        'نافس لاعبين من كل مكان في مباريات سودوكو مباشرة. التفكير السريع، والاستراتيجية الدقيقة، والتركيز هي طريق الفوز.',
      learnMore: 'اعرف المزيد',
      liveMatch: 'مباراة مباشرة',
      gameCode: 'لعبة #R7X9',
      rivalName: 'نادر',
      you: 'أنت',
      versus: 'ضد',
      mistakes: 'الأخطاء: 2 / 10',
      topPlayers: 'أفضل اللاعبين',
      viewFullLeaderboard: 'عرض لوحة الصدارة',
      team: 'الفريق',
      builtBy: 'بواسطة Sudoku Rival Games',
      footerTagline: 'فكر بحدة. نافس بقوة. كن المنافس.',
      game: 'اللعبة',
      community: 'المجتمع',
      tournaments: 'البطولات',
      about: 'عن الموقع',
      contact: 'تواصل معنا',
      followUs: 'تابعنا',
      copyright: '© {{ year }} Sudoku Rival Games. جميع الحقوق محفوظة.',
      howToIntro: 'Sudoku Rival',
      howToSteps: {
        one: 'أنشئ غرفة أو انضم إلى غرفة موجودة.',
        two: 'حل نفس اللغز أسرع من منافسك.',
        three: 'تجنب الأخطاء حتى لا تتعرض لعقوبات التجميد.',
        four: 'أول لوحة صحيحة بالكامل تفوز بالمباراة.',
      },
      actions: {
        pause: 'إيقاف',
        giveUp: 'انسحاب',
        notes: 'ملاحظات',
        erase: 'مسح',
        undo: 'تراجع',
        hint: 'تلميح',
      },
      features: {
        realtime: {
          kicker: 'مباشر',
          title: 'مباريات لحظية',
          description: 'العب ضد منافسين حقيقيين واشعر بضغط كل حركة.',
        },
        fairPlay: {
          kicker: 'لعب عادل',
          title: 'نظام منافسة عادل',
          description: 'توازن في المنافسة ومنطق يمنع الاستغلال ويحافظ على نزاهة اللعب.',
        },
        ranked: {
          kicker: 'تصنيف',
          title: 'لوحة صدارة عالمية',
          description: 'اجمع الانتصارات واصعد إلى القمة بين اللاعبين.',
        },
        penalty: {
          kicker: 'عقوبات',
          title: 'عقوبات ذكية',
          description: 'الأخطاء تسبب فترات تجميد تكافئ الدقة بدل التخمين.',
        },
      },
      teamMember: {
        role: 'المؤسس ومهندس التطبيق',
        bio: 'يشرف على اتجاه المنتج، والبنية اللحظية، وجودة منطق المباريات.',
      },
    },
    play: {
      kicker: 'تدريب فردي',
      title: 'العب سودوكو أونلاين',
      description:
        'ابدأ لوحة سودوكو سريعة أونلاين، وطور منطقك، واستعد لتحديات سودوكو مباشرة.',
      filled: 'الممتلئ:',
      controls: 'التحكم',
      practiceTitle: 'تدريب سريع',
      practiceSubtitle: 'طوّر السرعة والدقة قبل دخول اللعب الجماعي.',
      generating: 'جار إنشاء اللغز...',
      delete: 'حذف',
      numberHighlight: 'تمييز الرقم',
      errorCheck: 'فحص الأخطاء',
      resetBoard: 'إعادة اللوحة',
      goMultiplayer: 'اللعب الجماعي',
      on: 'تشغيل',
      off: 'إيقاف',
      greatRun: 'محاولة رائعة. ابدأ لغزاً جديداً أو ادخل اللعب الجماعي.',
      share: 'مشاركة',
      copy: 'نسخ',
      playAgain: 'العب مجدداً',
      enterMultiplayer: 'دخول ساحة اللعب الجماعي',
      solved: 'تم حل اللغز',
      complete: 'اكتملت السودوكو',
    },
    game: {
      empty: 'فارغة',
      cellLabel: 'الخانة {{ index }}، القيمة {{ value }}',
    },
    howToPlay: {
      kicker: 'قواعد السودوكو',
      title: 'طريقة لعب السودوكو',
      subtitle:
        'تعلم قواعد السودوكو الكلاسيكية ثم جرّب لعبة سودوكو أونلاين وتحدي سودوكو مع الأصدقاء.',
      basicsTitle: 'أساسيات السودوكو',
      basics:
        'املأ كل خانة فارغة برقم من 1 إلى 9. يجب أن يحتوي كل صف وعمود ومربع 3x3 على كل رقم مرة واحدة فقط.',
      onlineTitle: 'لعبة سودوكو أونلاين على Sudoku Rival',
      online:
        'اختر التدريب الفردي للتطوير السريع، أو سجل الدخول لإنشاء غرف وتحدي أصدقائك في مباريات مباشرة.',
      challengeTitle: 'قواعد تحدي سودوكو الجماعي',
      challenge:
        'كل اللاعبين يحلون نفس اللغز. الإجابات الصحيحة تزيد التقدم، والأخطاء قد تسبب عقوبات في الغرف المباشرة.',
      tipsTitle: 'نصائح مفيدة',
      tipsOne: 'افحص الصفوف والأعمدة والمربعات قبل التخمين.',
      tipsTwo: 'ابدأ بالخانات الواضحة حتى تفتح أجزاء أصعب.',
      tipsThree: 'في سودوكو مع الأصدقاء، الدقة غالباً أسرع من المخاطرة.',
      cta: 'ابدأ اللعب',
    },
    privacy: {
      kicker: 'قانوني',
      title: 'سياسة الخصوصية',
      intro:
        'يجمع Sudoku Rival المعلومات اللازمة فقط لتشغيل الحسابات، والغرف الجماعية، ولوحات الصدارة، والمدفوعات، وميزات الأمان.',
      dataTitle: 'المعلومات التي نستخدمها',
      data:
        'قد تتم معالجة بيانات الحساب، وتقدم اللعب، ونشاط المحفظة، والإشعارات، ومعلومات الدعم لتقديم الخدمة.',
      securityTitle: 'الأمان',
      security:
        'تتم إدارة المصادقة والوصول إلى قاعدة البيانات وبيانات الحساب عبر تكاملات التطبيق وقواعد الوصول الحالية.',
      choicesTitle: 'اختياراتك',
      choices:
        'يمكنك استخدام الإعدادات للتحكم في المظهر، واللغة، والأصوات، والإشعارات، وتفضيلات اللعبة المحفوظة على هذا الجهاز.',
    },
    terms: {
      kicker: 'قانوني',
      title: 'شروط الخدمة',
      intro:
        'باستخدام Sudoku Rival، توافق على اللعب بنزاهة، واحترام اللاعبين الآخرين، واتباع قواعد المنصة.',
      playTitle: 'اللعب العادل',
      play:
        'لا تستغل الأخطاء، أو تستخدم التشغيل الآلي، أو تسيء للاعبين، أو تحاول التلاعب بالغرف أو المحافظ أو المشتريات أو لوحة الصدارة.',
      accountsTitle: 'الحسابات والمشتريات',
      accounts:
        'أنت مسؤول عن نشاط حسابك. تتم مراجعة تأكيدات الشراء اليدوية قبل إضافة العملات.',
      availabilityTitle: 'الإتاحة',
      availability:
        'قد يغير Sudoku Rival الميزات أو القواعد أو الإتاحة لتحسين الاعتمادية والأمان وتوازن اللعب.',
    },
    settings: {
      kicker: 'التفضيلات',
      title: 'إعدادات Sudoku Rival',
      subtitle:
        'خصص اللغة، والمظهر، والأصوات، والإشعارات، وتفضيلات اللعب لهذا الجهاز.',
      language: {
        title: 'اللغة',
        description: 'يبقى الرابط هو مصدر اللغة الأساسي، ويتم حفظ اختيارك كتفضيل.',
        english: 'الإنجليزية',
        arabic: 'العربية',
      },
      theme: {
        title: 'المظهر',
        description: 'اختر وضع الألوان المستخدم في Sudoku Rival.',
        light: 'الوضع الفاتح',
        dark: 'الوضع الداكن',
      },
      sound: {
        title: 'الأصوات',
        description: 'تحكم في أصوات اللعبة للأحداث المستقبلية.',
        enabled: 'أصوات اللعبة',
      },
      notifications: {
        title: 'الإشعارات',
        description: 'لا يتم طلب إذن المتصفح إلا عند تفعيل الإشعارات بنفسك.',
        enabled: 'الإشعارات',
        unsupported: 'إشعارات المتصفح غير متاحة في هذه البيئة.',
        denied: 'الإشعارات محظورة من إعدادات المتصفح.',
      },
      gamePreferences: {
        title: 'تفضيلات اللعب',
        description: 'احفظ سلوك اللوحة للتدريب الفردي وشاشات اللعبة القادمة.',
        showMistakes: 'إظهار الأخطاء',
        highlightDuplicates: 'تمييز الأرقام المتكررة',
        autoCheck: 'فحص الإجابات تلقائياً',
        timer: 'المؤقت',
      },
      account: {
        title: 'الحساب',
        signedInAs: 'مسجل الدخول باسم {{ name }}',
        login: 'تسجيل الدخول',
        register: 'إنشاء حساب',
        logout: 'تسجيل الخروج',
        profile: 'فتح الملف الشخصي',
        guestMessage: 'سجل الدخول لإدارة الملف الشخصي والمحفظة والغرف وسجل المباريات.',
      },
    },
    seo: {
      siteName: 'Sudoku Rival',
      home: {
        title: 'Sudoku Rival - العب سودوكو أونلاين',
        description:
          'العب سودوكو أونلاين، تحدى أصدقاءك، وطور مهاراتك في حل الألغاز مع Sudoku Rival.',
      },
      play: {
        title: 'العب سودوكو أونلاين - Sudoku Rival',
        description:
          'العب سودوكو أونلاين في تدريب فردي أو انضم إلى تحديات سودوكو مباشرة مع Sudoku Rival.',
      },
      howToPlay: {
        title: 'طريقة لعب السودوكو - القواعد وتحديات الأونلاين',
        description:
          'تعلم طريقة لعب السودوكو، وافهم قواعد السودوكو، وابدأ تحدي سودوكو أونلاين أو مع الأصدقاء على Sudoku Rival.',
      },
      settings: {
        title: 'إعدادات Sudoku Rival - خصص تجربة اللعب',
        description:
          'خصص تجربة Sudoku Rival من حيث اللغة، المظهر، الأصوات، الإشعارات، وتفضيلات اللعب.',
      },
      privacy: {
        title: 'سياسة الخصوصية - Sudoku Rival',
        description:
          'اقرأ سياسة خصوصية Sudoku Rival لبيانات الحساب واللعب والإشعارات والتفضيلات.',
      },
      terms: {
        title: 'شروط الخدمة - Sudoku Rival',
        description:
          'اقرأ شروط خدمة Sudoku Rival الخاصة باللعب العادل والحسابات والمشتريات وقواعد المنصة.',
      },
      leaderboard: {
        title: 'لوحة صدارة سودوكو - Sudoku Rival',
        description: 'اعرض تصنيفات Sudoku Rival والانتصارات ونسبة الفوز وأداء العملات.',
      },
      default: {
        title: 'Sudoku Rival',
        description:
          'العب سودوكو أونلاين، تحدى المنافسين، وطور مهارات حل الألغاز مع Sudoku Rival.',
      },
    },
    errors: {
      pageNotFound: 'الصفحة غير موجودة',
      returnHome: 'العودة للرئيسية',
    },
  },
};
