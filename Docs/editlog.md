2026-02-15T03:53:33.1924889Z Current runner version: '2.331.0'
2026-02-15T03:53:33.1963520Z ##[group]Runner Image Provisioner
2026-02-15T03:53:33.1964888Z Hosted Compute Agent
2026-02-15T03:53:33.1966027Z Version: 20260123.484
2026-02-15T03:53:33.1967188Z Commit: 6bd6555ca37d84114959e1c76d2c01448ff61c5d
2026-02-15T03:53:33.1968405Z Build Date: 2026-01-23T19:41:17Z
2026-02-15T03:53:33.1969667Z Worker ID: {cfa79eef-21a9-4ccf-afd3-53e71221543e}
2026-02-15T03:53:33.1971369Z Azure Region: centralus
2026-02-15T03:53:33.1972309Z ##[endgroup]
2026-02-15T03:53:33.1974817Z ##[group]Operating System
2026-02-15T03:53:33.1975863Z Ubuntu
2026-02-15T03:53:33.1976817Z 24.04.3
2026-02-15T03:53:33.1977822Z LTS
2026-02-15T03:53:33.1978699Z ##[endgroup]
2026-02-15T03:53:33.1980095Z ##[group]Runner Image
2026-02-15T03:53:33.1981268Z Image: ubuntu-24.04
2026-02-15T03:53:33.1982287Z Version: 20260209.23.1
2026-02-15T03:53:33.1984614Z Included Software: https://github.com/actions/runner-images/blob/ubuntu24/20260209.23/images/ubuntu/Ubuntu2404-Readme.md
2026-02-15T03:53:33.1987559Z Image Release: https://github.com/actions/runner-images/releases/tag/ubuntu24%2F20260209.23
2026-02-15T03:53:33.1989386Z ##[endgroup]
2026-02-15T03:53:33.1992130Z ##[group]GITHUB_TOKEN Permissions
2026-02-15T03:53:33.1995017Z Contents: read
2026-02-15T03:53:33.1996037Z Metadata: read
2026-02-15T03:53:33.1997082Z Packages: read
2026-02-15T03:53:33.1998144Z ##[endgroup]
2026-02-15T03:53:33.2001492Z Secret source: Actions
2026-02-15T03:53:33.2002870Z Prepare workflow directory
2026-02-15T03:53:33.2740818Z Prepare all required actions
2026-02-15T03:53:33.2796362Z Getting action download info
2026-02-15T03:53:33.6272715Z Download action repository 'actions/checkout@v3' (SHA:f43a0e5ff2bd294095638e18286ca9a3d1956744)
2026-02-15T03:53:33.7782206Z Download action repository 'actions/setup-node@v3' (SHA:3235b876344d2a9aa001b8d1453c930bba69e610)
2026-02-15T03:53:33.9176836Z Download action repository 'actions/upload-artifact@v4' (SHA:ea165f8d65b6e75b540449e92b4886f43607fa02)
2026-02-15T03:53:34.2238233Z Complete job name: run-search
2026-02-15T03:53:34.3007258Z ##[group]Run actions/checkout@v3
2026-02-15T03:53:34.3008455Z with:
2026-02-15T03:53:34.3009237Z   repository: choidev777-bit/maptamin-project
2026-02-15T03:53:34.3010529Z   token: ***
2026-02-15T03:53:34.3011251Z   ssh-strict: true
2026-02-15T03:53:34.3012006Z   persist-credentials: true
2026-02-15T03:53:34.3012805Z   clean: true
2026-02-15T03:53:34.3013549Z   sparse-checkout-cone-mode: true
2026-02-15T03:53:34.3014392Z   fetch-depth: 1
2026-02-15T03:53:34.3015114Z   fetch-tags: false
2026-02-15T03:53:34.3015851Z   lfs: false
2026-02-15T03:53:34.3016560Z   submodules: false
2026-02-15T03:53:34.3017306Z   set-safe-directory: true
2026-02-15T03:53:34.3018367Z ##[endgroup]
2026-02-15T03:53:34.3986531Z Syncing repository: choidev777-bit/maptamin-project
2026-02-15T03:53:34.3999915Z ##[group]Getting Git version info
2026-02-15T03:53:34.4004190Z Working directory is '/home/runner/work/maptamin-project/maptamin-project'
2026-02-15T03:53:34.4007151Z [command]/usr/bin/git version
2026-02-15T03:53:34.4008799Z git version 2.52.0
2026-02-15T03:53:34.4036925Z ##[endgroup]
2026-02-15T03:53:34.4050806Z Temporarily overriding HOME='/home/runner/work/_temp/bd27d95c-c706-44b0-b60f-41a51743328f' before making global git config changes
2026-02-15T03:53:34.4054604Z Adding repository directory to the temporary git global config as a safe directory
2026-02-15T03:53:34.4058738Z [command]/usr/bin/git config --global --add safe.directory /home/runner/work/maptamin-project/maptamin-project
2026-02-15T03:53:34.4100550Z Deleting the contents of '/home/runner/work/maptamin-project/maptamin-project'
2026-02-15T03:53:34.4105614Z ##[group]Initializing the repository
2026-02-15T03:53:34.4110404Z [command]/usr/bin/git init /home/runner/work/maptamin-project/maptamin-project
2026-02-15T03:53:34.4221707Z hint: Using 'master' as the name for the initial branch. This default branch name
2026-02-15T03:53:34.4224953Z hint: will change to "main" in Git 3.0. To configure the initial branch name
2026-02-15T03:53:34.4229161Z hint: to use in all of your new repositories, which will suppress this warning,
2026-02-15T03:53:34.4231433Z hint: call:
2026-02-15T03:53:34.4232704Z hint:
2026-02-15T03:53:34.4236536Z hint: 	git config --global init.defaultBranch <name>
2026-02-15T03:53:34.4238539Z hint:
2026-02-15T03:53:34.4242225Z hint: Names commonly chosen instead of 'master' are 'main', 'trunk' and
2026-02-15T03:53:34.4244450Z hint: 'development'. The just-created branch can be renamed via this command:
2026-02-15T03:53:34.4246614Z hint:
2026-02-15T03:53:34.4247784Z hint: 	git branch -m <name>
2026-02-15T03:53:34.4249084Z hint:
2026-02-15T03:53:34.4251059Z hint: Disable this message with "git config set advice.defaultBranchName false"
2026-02-15T03:53:34.4253858Z Initialized empty Git repository in /home/runner/work/maptamin-project/maptamin-project/.git/
2026-02-15T03:53:34.4258283Z [command]/usr/bin/git remote add origin https://github.com/choidev777-bit/maptamin-project
2026-02-15T03:53:34.4287205Z ##[endgroup]
2026-02-15T03:53:34.4289382Z ##[group]Disabling automatic garbage collection
2026-02-15T03:53:34.4291449Z [command]/usr/bin/git config --local gc.auto 0
2026-02-15T03:53:34.4327770Z ##[endgroup]
2026-02-15T03:53:34.4330162Z ##[group]Setting up auth
2026-02-15T03:53:34.4332068Z [command]/usr/bin/git config --local --name-only --get-regexp core\.sshCommand
2026-02-15T03:53:34.4362338Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
2026-02-15T03:53:34.4711240Z [command]/usr/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
2026-02-15T03:53:34.4744766Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
2026-02-15T03:53:34.4994830Z [command]/usr/bin/git config --local http.https://github.com/.extraheader AUTHORIZATION: basic ***
2026-02-15T03:53:34.5033093Z ##[endgroup]
2026-02-15T03:53:34.5036667Z ##[group]Fetching the repository
2026-02-15T03:53:34.5043613Z [command]/usr/bin/git -c protocol.version=2 fetch --no-tags --prune --progress --no-recurse-submodules --depth=1 origin +1470e447ec57ec9d24fd04f93fba85c7aa2f4709:refs/remotes/origin/main
2026-02-15T03:53:34.7391819Z remote: Enumerating objects: 425, done.        
2026-02-15T03:53:34.7396689Z remote: Counting objects:   0% (1/425)        
2026-02-15T03:53:34.7397917Z remote: Counting objects:   1% (5/425)        
2026-02-15T03:53:34.7398998Z remote: Counting objects:   2% (9/425)        
2026-02-15T03:53:34.7400355Z remote: Counting objects:   3% (13/425)        
2026-02-15T03:53:34.7401435Z remote: Counting objects:   4% (17/425)        
2026-02-15T03:53:34.7402503Z remote: Counting objects:   5% (22/425)        
2026-02-15T03:53:34.7403575Z remote: Counting objects:   6% (26/425)        
2026-02-15T03:53:34.7404508Z remote: Counting objects:   7% (30/425)        
2026-02-15T03:53:34.7406127Z remote: Counting objects:   8% (34/425)        
2026-02-15T03:53:34.7408088Z remote: Counting objects:   9% (39/425)        
2026-02-15T03:53:34.7409076Z remote: Counting objects:  10% (43/425)        
2026-02-15T03:53:34.7410155Z remote: Counting objects:  11% (47/425)        
2026-02-15T03:53:34.7411094Z remote: Counting objects:  12% (51/425)        
2026-02-15T03:53:34.7412020Z remote: Counting objects:  13% (56/425)        
2026-02-15T03:53:34.7412915Z remote: Counting objects:  14% (60/425)        
2026-02-15T03:53:34.7413815Z remote: Counting objects:  15% (64/425)        
2026-02-15T03:53:34.7414704Z remote: Counting objects:  16% (68/425)        
2026-02-15T03:53:34.7415593Z remote: Counting objects:  17% (73/425)        
2026-02-15T03:53:34.7416487Z remote: Counting objects:  18% (77/425)        
2026-02-15T03:53:34.7417388Z remote: Counting objects:  19% (81/425)        
2026-02-15T03:53:34.7418301Z remote: Counting objects:  20% (85/425)        
2026-02-15T03:53:34.7419432Z remote: Counting objects:  21% (90/425)        
2026-02-15T03:53:34.7420444Z remote: Counting objects:  22% (94/425)        
2026-02-15T03:53:34.7421341Z remote: Counting objects:  23% (98/425)        
2026-02-15T03:53:34.7422247Z remote: Counting objects:  24% (102/425)        
2026-02-15T03:53:34.7423149Z remote: Counting objects:  25% (107/425)        
2026-02-15T03:53:34.7424044Z remote: Counting objects:  26% (111/425)        
2026-02-15T03:53:34.7424951Z remote: Counting objects:  27% (115/425)        
2026-02-15T03:53:34.7425885Z remote: Counting objects:  28% (119/425)        
2026-02-15T03:53:34.7426780Z remote: Counting objects:  29% (124/425)        
2026-02-15T03:53:34.7427682Z remote: Counting objects:  30% (128/425)        
2026-02-15T03:53:34.7428580Z remote: Counting objects:  31% (132/425)        
2026-02-15T03:53:34.7429469Z remote: Counting objects:  32% (136/425)        
2026-02-15T03:53:34.7430709Z remote: Counting objects:  33% (141/425)        
2026-02-15T03:53:34.7431643Z remote: Counting objects:  34% (145/425)        
2026-02-15T03:53:34.7432541Z remote: Counting objects:  35% (149/425)        
2026-02-15T03:53:34.7433435Z remote: Counting objects:  36% (153/425)        
2026-02-15T03:53:34.7434315Z remote: Counting objects:  37% (158/425)        
2026-02-15T03:53:34.7435194Z remote: Counting objects:  38% (162/425)        
2026-02-15T03:53:34.7436082Z remote: Counting objects:  39% (166/425)        
2026-02-15T03:53:34.7436984Z remote: Counting objects:  40% (170/425)        
2026-02-15T03:53:34.7437872Z remote: Counting objects:  41% (175/425)        
2026-02-15T03:53:34.7438751Z remote: Counting objects:  42% (179/425)        
2026-02-15T03:53:34.7439623Z remote: Counting objects:  43% (183/425)        
2026-02-15T03:53:34.7440615Z remote: Counting objects:  44% (187/425)        
2026-02-15T03:53:34.7441499Z remote: Counting objects:  45% (192/425)        
2026-02-15T03:53:34.7442861Z remote: Counting objects:  46% (196/425)        
2026-02-15T03:53:34.7444743Z remote: Counting objects:  47% (200/425)        
2026-02-15T03:53:34.7445735Z remote: Counting objects:  48% (204/425)        
2026-02-15T03:53:34.7447131Z remote: Counting objects:  49% (209/425)        
2026-02-15T03:53:34.7448718Z remote: Counting objects:  50% (213/425)        
2026-02-15T03:53:34.7450007Z remote: Counting objects:  51% (217/425)        
2026-02-15T03:53:34.7451868Z remote: Counting objects:  52% (221/425)        
2026-02-15T03:53:34.7453943Z remote: Counting objects:  53% (226/425)        
2026-02-15T03:53:34.7456351Z remote: Counting objects:  54% (230/425)        
2026-02-15T03:53:34.7457771Z remote: Counting objects:  55% (234/425)        
2026-02-15T03:53:34.7459191Z remote: Counting objects:  56% (238/425)        
2026-02-15T03:53:34.7460660Z remote: Counting objects:  57% (243/425)        
2026-02-15T03:53:34.7461955Z remote: Counting objects:  58% (247/425)        
2026-02-15T03:53:34.7463282Z remote: Counting objects:  59% (251/425)        
2026-02-15T03:53:34.7465246Z remote: Counting objects:  60% (255/425)        
2026-02-15T03:53:34.7466961Z remote: Counting objects:  61% (260/425)        
2026-02-15T03:53:34.7468259Z remote: Counting objects:  62% (264/425)        
2026-02-15T03:53:34.7469543Z remote: Counting objects:  63% (268/425)        
2026-02-15T03:53:34.7471220Z remote: Counting objects:  64% (272/425)        
2026-02-15T03:53:34.7472575Z remote: Counting objects:  65% (277/425)        
2026-02-15T03:53:34.7473892Z remote: Counting objects:  66% (281/425)        
2026-02-15T03:53:34.7475212Z remote: Counting objects:  67% (285/425)        
2026-02-15T03:53:34.7476807Z remote: Counting objects:  68% (289/425)        
2026-02-15T03:53:34.7478684Z remote: Counting objects:  69% (294/425)        
2026-02-15T03:53:34.7480328Z remote: Counting objects:  70% (298/425)        
2026-02-15T03:53:34.7481679Z remote: Counting objects:  71% (302/425)        
2026-02-15T03:53:34.7482996Z remote: Counting objects:  72% (306/425)        
2026-02-15T03:53:34.7484578Z remote: Counting objects:  73% (311/425)        
2026-02-15T03:53:34.7485904Z remote: Counting objects:  74% (315/425)        
2026-02-15T03:53:34.7487212Z remote: Counting objects:  75% (319/425)        
2026-02-15T03:53:34.7488534Z remote: Counting objects:  76% (323/425)        
2026-02-15T03:53:34.7490606Z remote: Counting objects:  77% (328/425)        
2026-02-15T03:53:34.7492526Z remote: Counting objects:  78% (332/425)        
2026-02-15T03:53:34.7493896Z remote: Counting objects:  79% (336/425)        
2026-02-15T03:53:34.7495268Z remote: Counting objects:  80% (340/425)        
2026-02-15T03:53:34.7496601Z remote: Counting objects:  81% (345/425)        
2026-02-15T03:53:34.7497936Z remote: Counting objects:  82% (349/425)        
2026-02-15T03:53:34.7499257Z remote: Counting objects:  83% (353/425)        
2026-02-15T03:53:34.7500843Z remote: Counting objects:  84% (357/425)        
2026-02-15T03:53:34.7502158Z remote: Counting objects:  85% (362/425)        
2026-02-15T03:53:34.7503525Z remote: Counting objects:  86% (366/425)        
2026-02-15T03:53:34.7504844Z remote: Counting objects:  87% (370/425)        
2026-02-15T03:53:34.7506169Z remote: Counting objects:  88% (374/425)        
2026-02-15T03:53:34.7507898Z remote: Counting objects:  89% (379/425)        
2026-02-15T03:53:34.7509920Z remote: Counting objects:  90% (383/425)        
2026-02-15T03:53:34.7511288Z remote: Counting objects:  91% (387/425)        
2026-02-15T03:53:34.7512629Z remote: Counting objects:  92% (391/425)        
2026-02-15T03:53:34.7513944Z remote: Counting objects:  93% (396/425)        
2026-02-15T03:53:34.7515256Z remote: Counting objects:  94% (400/425)        
2026-02-15T03:53:34.7516564Z remote: Counting objects:  95% (404/425)        
2026-02-15T03:53:34.7517865Z remote: Counting objects:  96% (408/425)        
2026-02-15T03:53:34.7519159Z remote: Counting objects:  97% (413/425)        
2026-02-15T03:53:34.7520599Z remote: Counting objects:  98% (417/425)        
2026-02-15T03:53:34.7522739Z remote: Counting objects:  99% (421/425)        
2026-02-15T03:53:34.7524291Z remote: Counting objects: 100% (425/425)        
2026-02-15T03:53:34.7525663Z remote: Counting objects: 100% (425/425), done.        
2026-02-15T03:53:34.7527028Z remote: Compressing objects:   0% (1/364)        
2026-02-15T03:53:34.7528359Z remote: Compressing objects:   1% (4/364)        
2026-02-15T03:53:34.7529804Z remote: Compressing objects:   2% (8/364)        
2026-02-15T03:53:34.7531188Z remote: Compressing objects:   3% (11/364)        
2026-02-15T03:53:34.7532553Z remote: Compressing objects:   4% (15/364)        
2026-02-15T03:53:34.7533891Z remote: Compressing objects:   5% (19/364)        
2026-02-15T03:53:34.7535228Z remote: Compressing objects:   6% (22/364)        
2026-02-15T03:53:34.7536560Z remote: Compressing objects:   7% (26/364)        
2026-02-15T03:53:34.7537898Z remote: Compressing objects:   8% (30/364)        
2026-02-15T03:53:34.7539233Z remote: Compressing objects:   9% (33/364)        
2026-02-15T03:53:34.7540764Z remote: Compressing objects:  10% (37/364)        
2026-02-15T03:53:34.7542115Z remote: Compressing objects:  11% (41/364)        
2026-02-15T03:53:34.7543450Z remote: Compressing objects:  12% (44/364)        
2026-02-15T03:53:34.7544777Z remote: Compressing objects:  13% (48/364)        
2026-02-15T03:53:34.7546118Z remote: Compressing objects:  14% (51/364)        
2026-02-15T03:53:34.7547346Z remote: Compressing objects:  15% (55/364)        
2026-02-15T03:53:34.7618153Z remote: Compressing objects:  16% (59/364)        
2026-02-15T03:53:34.7620542Z remote: Compressing objects:  17% (62/364)        
2026-02-15T03:53:34.7622292Z remote: Compressing objects:  18% (66/364)        
2026-02-15T03:53:34.7623963Z remote: Compressing objects:  19% (70/364)        
2026-02-15T03:53:34.7625359Z remote: Compressing objects:  20% (73/364)        
2026-02-15T03:53:34.7626714Z remote: Compressing objects:  21% (77/364)        
2026-02-15T03:53:34.7628064Z remote: Compressing objects:  22% (81/364)        
2026-02-15T03:53:34.7630131Z remote: Compressing objects:  23% (84/364)        
2026-02-15T03:53:34.7632229Z remote: Compressing objects:  24% (88/364)        
2026-02-15T03:53:34.7633685Z remote: Compressing objects:  25% (91/364)        
2026-02-15T03:53:34.7635054Z remote: Compressing objects:  26% (95/364)        
2026-02-15T03:53:34.7636712Z remote: Compressing objects:  27% (99/364)        
2026-02-15T03:53:34.7638614Z remote: Compressing objects:  28% (102/364)        
2026-02-15T03:53:34.7640170Z remote: Compressing objects:  29% (106/364)        
2026-02-15T03:53:34.7641613Z remote: Compressing objects:  30% (110/364)        
2026-02-15T03:53:34.7642962Z remote: Compressing objects:  31% (113/364)        
2026-02-15T03:53:34.7644199Z remote: Compressing objects:  32% (117/364)        
2026-02-15T03:53:34.7647603Z remote: Compressing objects:  33% (121/364)        
2026-02-15T03:53:34.7654295Z remote: Compressing objects:  34% (124/364)        
2026-02-15T03:53:34.7659079Z remote: Compressing objects:  35% (128/364)        
2026-02-15T03:53:34.7660728Z remote: Compressing objects:  36% (132/364)        
2026-02-15T03:53:34.7665771Z remote: Compressing objects:  37% (135/364)        
2026-02-15T03:53:34.7666754Z remote: Compressing objects:  38% (139/364)        
2026-02-15T03:53:34.7672456Z remote: Compressing objects:  39% (142/364)        
2026-02-15T03:53:34.7674352Z remote: Compressing objects:  40% (146/364)        
2026-02-15T03:53:34.7675759Z remote: Compressing objects:  41% (150/364)        
2026-02-15T03:53:34.7677031Z remote: Compressing objects:  42% (153/364)        
2026-02-15T03:53:34.7682911Z remote: Compressing objects:  43% (157/364)        
2026-02-15T03:53:34.7684836Z remote: Compressing objects:  44% (161/364)        
2026-02-15T03:53:34.7686813Z remote: Compressing objects:  45% (164/364)        
2026-02-15T03:53:34.7688864Z remote: Compressing objects:  46% (168/364)        
2026-02-15T03:53:34.7690445Z remote: Compressing objects:  47% (172/364)        
2026-02-15T03:53:34.7692025Z remote: Compressing objects:  48% (175/364)        
2026-02-15T03:53:34.7705951Z remote: Compressing objects:  49% (179/364)        
2026-02-15T03:53:34.7707317Z remote: Compressing objects:  50% (182/364)        
2026-02-15T03:53:35.1546340Z remote: Compressing objects:  51% (186/364)        
2026-02-15T03:53:35.1551385Z remote: Compressing objects:  52% (190/364)        
2026-02-15T03:53:35.1553167Z remote: Compressing objects:  53% (193/364)        
2026-02-15T03:53:35.1555241Z remote: Compressing objects:  54% (197/364)        
2026-02-15T03:53:35.1557818Z remote: Compressing objects:  55% (201/364)        
2026-02-15T03:53:35.1559962Z remote: Compressing objects:  56% (204/364)        
2026-02-15T03:53:35.1561693Z remote: Compressing objects:  57% (208/364)        
2026-02-15T03:53:35.1565397Z remote: Compressing objects:  58% (212/364)        
2026-02-15T03:53:35.1567622Z remote: Compressing objects:  59% (215/364)        
2026-02-15T03:53:35.1569313Z remote: Compressing objects:  60% (219/364)        
2026-02-15T03:53:35.1571164Z remote: Compressing objects:  61% (223/364)        
2026-02-15T03:53:35.1572716Z remote: Compressing objects:  62% (226/364)        
2026-02-15T03:53:35.1574252Z remote: Compressing objects:  63% (230/364)        
2026-02-15T03:53:35.1575846Z remote: Compressing objects:  64% (233/364)        
2026-02-15T03:53:35.1577709Z remote: Compressing objects:  65% (237/364)        
2026-02-15T03:53:35.1579223Z remote: Compressing objects:  66% (241/364)        
2026-02-15T03:53:35.1580890Z remote: Compressing objects:  67% (244/364)        
2026-02-15T03:53:35.1584782Z remote: Compressing objects:  68% (248/364)        
2026-02-15T03:53:35.1587914Z remote: Compressing objects:  69% (252/364)        
2026-02-15T03:53:35.1591474Z remote: Compressing objects:  70% (255/364)        
2026-02-15T03:53:35.1594915Z remote: Compressing objects:  71% (259/364)        
2026-02-15T03:53:35.1602905Z remote: Compressing objects:  72% (263/364)        
2026-02-15T03:53:35.1619640Z remote: Compressing objects:  73% (266/364)        
2026-02-15T03:53:35.1625309Z remote: Compressing objects:  74% (270/364)        
2026-02-15T03:53:35.1633169Z remote: Compressing objects:  75% (273/364)        
2026-02-15T03:53:35.1635208Z remote: Compressing objects:  76% (277/364)        
2026-02-15T03:53:35.1643847Z remote: Compressing objects:  77% (281/364)        
2026-02-15T03:53:35.1653810Z remote: Compressing objects:  78% (284/364)        
2026-02-15T03:53:35.1660461Z remote: Compressing objects:  79% (288/364)        
2026-02-15T03:53:35.1663301Z remote: Compressing objects:  80% (292/364)        
2026-02-15T03:53:35.1665278Z remote: Compressing objects:  81% (295/364)        
2026-02-15T03:53:35.1675357Z remote: Compressing objects:  82% (299/364)        
2026-02-15T03:53:35.1677763Z remote: Compressing objects:  83% (303/364)        
2026-02-15T03:53:35.1680201Z remote: Compressing objects:  84% (306/364)        
2026-02-15T03:53:35.1682424Z remote: Compressing objects:  85% (310/364)        
2026-02-15T03:53:35.1684843Z remote: Compressing objects:  86% (314/364)        
2026-02-15T03:53:35.1687000Z remote: Compressing objects:  87% (317/364)        
2026-02-15T03:53:35.1689277Z remote: Compressing objects:  88% (321/364)        
2026-02-15T03:53:35.1695561Z remote: Compressing objects:  89% (324/364)        
2026-02-15T03:53:35.1696831Z remote: Compressing objects:  90% (328/364)        
2026-02-15T03:53:35.1698383Z remote: Compressing objects:  91% (332/364)        
2026-02-15T03:53:35.1700114Z remote: Compressing objects:  92% (335/364)        
2026-02-15T03:53:35.1701805Z remote: Compressing objects:  93% (339/364)        
2026-02-15T03:53:35.1703703Z remote: Compressing objects:  94% (343/364)        
2026-02-15T03:53:35.1705565Z remote: Compressing objects:  95% (346/364)        
2026-02-15T03:53:35.1707771Z remote: Compressing objects:  96% (350/364)        
2026-02-15T03:53:35.1710983Z remote: Compressing objects:  97% (354/364)        
2026-02-15T03:53:35.1712790Z remote: Compressing objects:  98% (357/364)        
2026-02-15T03:53:35.1715000Z remote: Compressing objects:  99% (361/364)        
2026-02-15T03:53:35.1716845Z remote: Compressing objects: 100% (364/364)        
2026-02-15T03:53:35.1718850Z remote: Compressing objects: 100% (364/364), done.        
2026-02-15T03:53:35.1721073Z Receiving objects:   0% (1/425)
2026-02-15T03:53:35.1722482Z Receiving objects:   1% (5/425)
2026-02-15T03:53:35.1723774Z Receiving objects:   2% (9/425)
2026-02-15T03:53:35.1773779Z Receiving objects:   3% (13/425)
2026-02-15T03:53:35.1782625Z Receiving objects:   4% (17/425)
2026-02-15T03:53:35.1799288Z Receiving objects:   5% (22/425)
2026-02-15T03:53:35.1801254Z Receiving objects:   6% (26/425)
2026-02-15T03:53:35.1804425Z Receiving objects:   7% (30/425)
2026-02-15T03:53:35.1806935Z Receiving objects:   8% (34/425)
2026-02-15T03:53:35.1811207Z Receiving objects:   9% (39/425)
2026-02-15T03:53:35.1819922Z Receiving objects:  10% (43/425)
2026-02-15T03:53:35.1832014Z Receiving objects:  11% (47/425)
2026-02-15T03:53:35.1852075Z Receiving objects:  12% (51/425)
2026-02-15T03:53:35.1928300Z Receiving objects:  13% (56/425)
2026-02-15T03:53:35.1930020Z Receiving objects:  14% (60/425)
2026-02-15T03:53:35.2008786Z Receiving objects:  15% (64/425)
2026-02-15T03:53:35.2011944Z Receiving objects:  16% (68/425)
2026-02-15T03:53:35.2017450Z Receiving objects:  17% (73/425)
2026-02-15T03:53:35.2019155Z Receiving objects:  18% (77/425)
2026-02-15T03:53:35.2021387Z Receiving objects:  19% (81/425)
2026-02-15T03:53:35.2023078Z Receiving objects:  20% (85/425)
2026-02-15T03:53:35.2025783Z Receiving objects:  21% (90/425)
2026-02-15T03:53:35.2028960Z Receiving objects:  22% (94/425)
2026-02-15T03:53:35.2040605Z Receiving objects:  23% (98/425)
2026-02-15T03:53:35.2047403Z Receiving objects:  24% (102/425)
2026-02-15T03:53:35.2048749Z Receiving objects:  25% (107/425)
2026-02-15T03:53:35.2051399Z Receiving objects:  26% (111/425)
2026-02-15T03:53:35.2052833Z Receiving objects:  27% (115/425)
2026-02-15T03:53:35.6446346Z Receiving objects:  28% (119/425)
2026-02-15T03:53:35.6543855Z Receiving objects:  29% (124/425)
2026-02-15T03:53:35.6574902Z Receiving objects:  30% (128/425)
2026-02-15T03:53:35.6586980Z Receiving objects:  31% (132/425)
2026-02-15T03:53:35.6598197Z Receiving objects:  32% (136/425)
2026-02-15T03:53:35.6617564Z Receiving objects:  33% (141/425)
2026-02-15T03:53:35.6632061Z Receiving objects:  34% (145/425)
2026-02-15T03:53:35.6640763Z Receiving objects:  35% (149/425)
2026-02-15T03:53:35.6648599Z Receiving objects:  36% (153/425)
2026-02-15T03:53:35.6656491Z Receiving objects:  37% (158/425)
2026-02-15T03:53:35.6721781Z Receiving objects:  38% (162/425)
2026-02-15T03:53:35.6723954Z Receiving objects:  39% (166/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.6857552Z Receiving objects:  40% (170/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.6872799Z Receiving objects:  41% (175/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.6875104Z Receiving objects:  42% (179/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.6878402Z Receiving objects:  43% (183/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.6880908Z Receiving objects:  44% (187/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.6884155Z Receiving objects:  45% (192/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.6886190Z Receiving objects:  46% (196/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.6888274Z Receiving objects:  47% (200/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.6906075Z Receiving objects:  48% (204/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.6908171Z Receiving objects:  49% (209/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.6910358Z Receiving objects:  50% (213/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.6912392Z Receiving objects:  51% (217/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.6932464Z Receiving objects:  52% (221/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.6935021Z Receiving objects:  53% (226/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.6937246Z Receiving objects:  54% (230/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.6940024Z Receiving objects:  55% (234/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.6942342Z Receiving objects:  56% (238/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.6944684Z Receiving objects:  57% (243/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.6947811Z Receiving objects:  58% (247/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.6950130Z Receiving objects:  59% (251/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.6952151Z Receiving objects:  60% (255/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.6954107Z Receiving objects:  61% (260/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.6961152Z Receiving objects:  62% (264/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.6963258Z Receiving objects:  63% (268/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.7075205Z Receiving objects:  64% (272/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.8922007Z Receiving objects:  65% (277/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.8931567Z Receiving objects:  66% (281/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.8936139Z Receiving objects:  67% (285/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.8938177Z Receiving objects:  68% (289/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.8940338Z Receiving objects:  69% (294/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.8942615Z Receiving objects:  70% (298/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.8944580Z Receiving objects:  71% (302/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.8964379Z Receiving objects:  72% (306/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.8965826Z Receiving objects:  73% (311/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.8967058Z Receiving objects:  74% (315/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.8968285Z Receiving objects:  75% (319/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.8969502Z Receiving objects:  76% (323/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.8971032Z Receiving objects:  77% (328/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.8972238Z Receiving objects:  78% (332/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.8973704Z Receiving objects:  79% (336/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.8974944Z Receiving objects:  80% (340/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.8976148Z Receiving objects:  81% (345/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.8977352Z Receiving objects:  82% (349/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.8978562Z Receiving objects:  83% (353/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.8979881Z Receiving objects:  84% (357/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.9045528Z Receiving objects:  85% (362/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.9050602Z Receiving objects:  86% (366/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.9060706Z Receiving objects:  87% (370/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.9069125Z Receiving objects:  88% (374/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.9071500Z Receiving objects:  89% (379/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.9073479Z Receiving objects:  90% (383/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.9075481Z Receiving objects:  91% (387/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.9080239Z Receiving objects:  92% (391/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.9083658Z Receiving objects:  93% (396/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.9087250Z Receiving objects:  94% (400/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.9090004Z Receiving objects:  95% (404/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.9092621Z Receiving objects:  96% (408/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.9097876Z Receiving objects:  97% (413/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:35.9100041Z Receiving objects:  98% (417/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:36.1698372Z Receiving objects:  99% (421/425), 3.58 MiB | 7.15 MiB/s
2026-02-15T03:53:36.6347123Z Receiving objects:  99% (422/425), 14.04 MiB | 14.05 MiB/s
2026-02-15T03:53:36.6349652Z remote: Total 425 (delta 36), reused 317 (delta 22), pack-reused 0 (from 0)        
2026-02-15T03:53:36.6370759Z Receiving objects: 100% (425/425), 14.04 MiB | 14.05 MiB/s
2026-02-15T03:53:36.6371851Z Receiving objects: 100% (425/425), 34.97 MiB | 23.84 MiB/s, done.
2026-02-15T03:53:36.6374567Z Resolving deltas:   0% (0/36)
2026-02-15T03:53:36.6379225Z Resolving deltas:   2% (1/36)
2026-02-15T03:53:36.6379947Z Resolving deltas:   5% (2/36)
2026-02-15T03:53:36.6380495Z Resolving deltas:   8% (3/36)
2026-02-15T03:53:36.6380937Z Resolving deltas:  11% (4/36)
2026-02-15T03:53:36.6381352Z Resolving deltas:  13% (5/36)
2026-02-15T03:53:36.6381768Z Resolving deltas:  16% (6/36)
2026-02-15T03:53:36.6391641Z Resolving deltas:  19% (7/36)
2026-02-15T03:53:36.6393813Z Resolving deltas:  22% (8/36)
2026-02-15T03:53:36.6411998Z Resolving deltas:  25% (9/36)
2026-02-15T03:53:36.6412513Z Resolving deltas:  27% (10/36)
2026-02-15T03:53:36.6412970Z Resolving deltas:  30% (11/36)
2026-02-15T03:53:36.6413416Z Resolving deltas:  33% (12/36)
2026-02-15T03:53:36.6413857Z Resolving deltas:  38% (14/36)
2026-02-15T03:53:36.6414300Z Resolving deltas:  41% (15/36)
2026-02-15T03:53:36.6414764Z Resolving deltas:  44% (16/36)
2026-02-15T03:53:36.6415201Z Resolving deltas:  47% (17/36)
2026-02-15T03:53:36.6415636Z Resolving deltas:  52% (19/36)
2026-02-15T03:53:36.6416058Z Resolving deltas:  55% (20/36)
2026-02-15T03:53:36.6416482Z Resolving deltas:  58% (21/36)
2026-02-15T03:53:36.6416926Z Resolving deltas:  61% (22/36)
2026-02-15T03:53:36.6417399Z Resolving deltas:  63% (23/36)
2026-02-15T03:53:36.6417858Z Resolving deltas:  66% (24/36)
2026-02-15T03:53:36.6418336Z Resolving deltas:  69% (25/36)
2026-02-15T03:53:36.6418925Z Resolving deltas:  72% (26/36)
2026-02-15T03:53:36.6419422Z Resolving deltas:  75% (27/36)
2026-02-15T03:53:36.6420119Z Resolving deltas:  77% (28/36)
2026-02-15T03:53:36.6420572Z Resolving deltas:  80% (29/36)
2026-02-15T03:53:36.6421004Z Resolving deltas:  83% (30/36)
2026-02-15T03:53:36.6421448Z Resolving deltas:  86% (31/36)
2026-02-15T03:53:36.6421927Z Resolving deltas:  88% (32/36)
2026-02-15T03:53:36.6422359Z Resolving deltas:  91% (33/36)
2026-02-15T03:53:36.6423747Z Resolving deltas:  94% (34/36)
2026-02-15T03:53:36.6424241Z Resolving deltas:  97% (35/36)
2026-02-15T03:53:36.6424706Z Resolving deltas: 100% (36/36)
2026-02-15T03:53:36.6425176Z Resolving deltas: 100% (36/36), done.
2026-02-15T03:53:36.6688031Z From https://github.com/choidev777-bit/maptamin-project
2026-02-15T03:53:36.6690510Z  * [new ref]         1470e447ec57ec9d24fd04f93fba85c7aa2f4709 -> origin/main
2026-02-15T03:53:36.6726404Z ##[endgroup]
2026-02-15T03:53:36.6727092Z ##[group]Determining the checkout info
2026-02-15T03:53:36.6728000Z ##[endgroup]
2026-02-15T03:53:36.6730472Z ##[group]Checking out the ref
2026-02-15T03:53:36.6734099Z [command]/usr/bin/git checkout --progress --force -B main refs/remotes/origin/main
2026-02-15T03:53:36.8668818Z Switched to a new branch 'main'
2026-02-15T03:53:36.8673192Z branch 'main' set up to track 'origin/main'.
2026-02-15T03:53:36.8694184Z ##[endgroup]
2026-02-15T03:53:36.8771407Z [command]/usr/bin/git log -1 --format='%H'
2026-02-15T03:53:36.8790493Z '1470e447ec57ec9d24fd04f93fba85c7aa2f4709'
2026-02-15T03:53:36.9027211Z ##[group]Run actions/setup-node@v3
2026-02-15T03:53:36.9027501Z with:
2026-02-15T03:53:36.9027694Z   node-version: 18
2026-02-15T03:53:36.9027902Z   cache: npm
2026-02-15T03:53:36.9028094Z   always-auth: false
2026-02-15T03:53:36.9028314Z   check-latest: false
2026-02-15T03:53:36.9028654Z   token: ***
2026-02-15T03:53:36.9028851Z ##[endgroup]
2026-02-15T03:53:37.1310650Z Attempting to download 18...
2026-02-15T03:53:37.6066110Z Acquiring 18.20.8 - x64 from https://github.com/actions/node-versions/releases/download/18.20.8-14110393767/node-18.20.8-linux-x64.tar.gz
2026-02-15T03:53:38.4746050Z Extracting ...
2026-02-15T03:53:38.4883696Z [command]/usr/bin/tar xz --strip 1 --warning=no-unknown-keyword -C /home/runner/work/_temp/cc002256-c237-43cf-98ef-38b2795c2f07 -f /home/runner/work/_temp/a88520e5-96f4-42a6-8b9b-ddb53b8fcbfc
2026-02-15T03:53:39.5527454Z Adding to the cache ...
2026-02-15T03:53:41.7691524Z ##[group]Environment details
2026-02-15T03:53:42.0608435Z node: v18.20.8
2026-02-15T03:53:42.0614322Z npm: 10.8.2
2026-02-15T03:53:42.0619298Z yarn: 1.22.22
2026-02-15T03:53:42.0622597Z ##[endgroup]
2026-02-15T03:53:42.0625580Z [command]/opt/hostedtoolcache/node/18.20.8/x64/bin/npm config get cache
2026-02-15T03:53:42.1833970Z /home/runner/.npm
2026-02-15T03:53:42.3251126Z Cache hit for: node-cache-Linux-npm-892baaf18cfb930776fa2ce20ce782412b5a0e2520da1d45b69f668589191c31
2026-02-15T03:53:43.4941073Z Received 83886080 of 216050332 (38.8%), 78.4 MBs/sec
2026-02-15T03:53:44.5041136Z Received 207661724 of 216050332 (96.1%), 97.5 MBs/sec
2026-02-15T03:53:44.6061862Z Received 216050332 of 216050332 (100.0%), 96.6 MBs/sec
2026-02-15T03:53:44.6068486Z Cache Size: ~206 MB (216050332 B)
2026-02-15T03:53:44.6322430Z [command]/usr/bin/tar -xf /home/runner/work/_temp/eb6d37a5-2754-4a08-97e8-05a0d51fbeaa/cache.tzst -P -C /home/runner/work/maptamin-project/maptamin-project --use-compress-program unzstd
2026-02-15T03:53:45.3543123Z Cache restored successfully
2026-02-15T03:53:45.4118197Z Cache restored from key: node-cache-Linux-npm-892baaf18cfb930776fa2ce20ce782412b5a0e2520da1d45b69f668589191c31
2026-02-15T03:53:45.4406656Z ##[group]Run npm ci --legacy-peer-deps
2026-02-15T03:53:45.4407239Z [36;1mnpm ci --legacy-peer-deps[0m
2026-02-15T03:53:45.4484982Z shell: /usr/bin/bash -e {0}
2026-02-15T03:53:45.4485434Z ##[endgroup]
2026-02-15T03:53:46.8523718Z npm warn EBADENGINE Unsupported engine {
2026-02-15T03:53:46.8524683Z npm warn EBADENGINE   package: '@supabase/auth-js@2.90.1',
2026-02-15T03:53:46.8525585Z npm warn EBADENGINE   required: { node: '>=20.0.0' },
2026-02-15T03:53:46.8526604Z npm warn EBADENGINE   current: { node: 'v18.20.8', npm: '10.8.2' }
2026-02-15T03:53:46.8527321Z npm warn EBADENGINE }
2026-02-15T03:53:46.8528225Z npm warn EBADENGINE Unsupported engine {
2026-02-15T03:53:46.8529297Z npm warn EBADENGINE   package: '@supabase/functions-js@2.90.1',
2026-02-15T03:53:46.8541056Z npm warn EBADENGINE   required: { node: '>=20.0.0' },
2026-02-15T03:53:46.8542376Z npm warn EBADENGINE   current: { node: 'v18.20.8', npm: '10.8.2' }
2026-02-15T03:53:46.8543117Z npm warn EBADENGINE }
2026-02-15T03:53:46.8543771Z npm warn EBADENGINE Unsupported engine {
2026-02-15T03:53:46.8544616Z npm warn EBADENGINE   package: '@supabase/postgrest-js@2.90.1',
2026-02-15T03:53:46.8557193Z npm warn EBADENGINE   required: { node: '>=20.0.0' },
2026-02-15T03:53:46.8558114Z npm warn EBADENGINE   current: { node: 'v18.20.8', npm: '10.8.2' }
2026-02-15T03:53:46.8558771Z npm warn EBADENGINE }
2026-02-15T03:53:46.8559299Z npm warn EBADENGINE Unsupported engine {
2026-02-15T03:53:46.8560320Z npm warn EBADENGINE   package: '@supabase/realtime-js@2.90.1',
2026-02-15T03:53:46.8561189Z npm warn EBADENGINE   required: { node: '>=20.0.0' },
2026-02-15T03:53:46.8562075Z npm warn EBADENGINE   current: { node: 'v18.20.8', npm: '10.8.2' }
2026-02-15T03:53:46.8562779Z npm warn EBADENGINE }
2026-02-15T03:53:46.8563321Z npm warn EBADENGINE Unsupported engine {
2026-02-15T03:53:46.8564111Z npm warn EBADENGINE   package: '@supabase/storage-js@2.90.1',
2026-02-15T03:53:46.8564979Z npm warn EBADENGINE   required: { node: '>=20.0.0' },
2026-02-15T03:53:46.8565862Z npm warn EBADENGINE   current: { node: 'v18.20.8', npm: '10.8.2' }
2026-02-15T03:53:46.8566561Z npm warn EBADENGINE }
2026-02-15T03:53:46.8567139Z npm warn EBADENGINE Unsupported engine {
2026-02-15T03:53:46.8568027Z npm warn EBADENGINE   package: '@supabase/supabase-js@2.90.1',
2026-02-15T03:53:46.8568898Z npm warn EBADENGINE   required: { node: '>=20.0.0' },
2026-02-15T03:53:46.8590318Z npm warn EBADENGINE   current: { node: 'v18.20.8', npm: '10.8.2' }
2026-02-15T03:53:46.8591121Z npm warn EBADENGINE }
2026-02-15T03:53:46.8591719Z npm warn EBADENGINE Unsupported engine {
2026-02-15T03:53:46.8592474Z npm warn EBADENGINE   package: 'iceberg-js@0.8.1',
2026-02-15T03:53:46.8593281Z npm warn EBADENGINE   required: { node: '>=20.0.0' },
2026-02-15T03:53:46.8594140Z npm warn EBADENGINE   current: { node: 'v18.20.8', npm: '10.8.2' }
2026-02-15T03:53:46.8594906Z npm warn EBADENGINE }
2026-02-15T03:53:46.8597110Z npm warn EBADENGINE Unsupported engine {
2026-02-15T03:53:46.8597849Z npm warn EBADENGINE   package: 'next@16.1.3',
2026-02-15T03:53:46.8598607Z npm warn EBADENGINE   required: { node: '>=20.9.0' },
2026-02-15T03:53:46.8599478Z npm warn EBADENGINE   current: { node: 'v18.20.8', npm: '10.8.2' }
2026-02-15T03:53:46.8600406Z npm warn EBADENGINE }
2026-02-15T03:53:52.3590141Z npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
2026-02-15T03:53:52.4211241Z npm warn deprecated lodash.pick@4.4.0: This package is deprecated. Use destructuring assignment syntax instead.
2026-02-15T03:53:52.4983345Z npm warn deprecated lodash.omit@4.5.0: This package is deprecated. Use destructuring assignment syntax instead.
2026-02-15T03:53:52.5741785Z npm warn deprecated whatwg-encoding@3.1.1: Use @exodus/bytes instead for a more spec-conformant and faster implementation
2026-02-15T03:53:52.8326057Z npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
2026-02-15T03:54:06.6070766Z 
2026-02-15T03:54:06.6071453Z added 842 packages, and audited 843 packages in 21s
2026-02-15T03:54:06.6071942Z 
2026-02-15T03:54:06.6072239Z 194 packages are looking for funding
2026-02-15T03:54:06.6072784Z   run `npm fund` for details
2026-02-15T03:54:06.7055770Z 
2026-02-15T03:54:06.7056609Z 3 high severity vulnerabilities
2026-02-15T03:54:06.7056988Z 
2026-02-15T03:54:06.7057418Z To address all issues (including breaking changes), run:
2026-02-15T03:54:06.7058034Z   npm audit fix --force
2026-02-15T03:54:06.7058305Z 
2026-02-15T03:54:06.7058639Z Run `npm audit` for details.
2026-02-15T03:54:06.8209484Z ##[group]Run npx playwright install chromium --with-deps
2026-02-15T03:54:06.8210262Z [36;1mnpx playwright install chromium --with-deps[0m
2026-02-15T03:54:06.8259279Z shell: /usr/bin/bash -e {0}
2026-02-15T03:54:06.8259859Z ##[endgroup]
2026-02-15T03:54:07.9238484Z Installing dependencies...
2026-02-15T03:54:07.9322773Z Switching to root user to install dependencies...
2026-02-15T03:54:08.0636400Z Get:1 file:/etc/apt/apt-mirrors.txt Mirrorlist [144 B]
2026-02-15T03:54:08.0995602Z Get:6 https://packages.microsoft.com/repos/azure-cli noble InRelease [3564 B]
2026-02-15T03:54:08.1191444Z Get:7 https://packages.microsoft.com/ubuntu/24.04/prod noble InRelease [3600 B]
2026-02-15T03:54:08.2180924Z Hit:2 http://azure.archive.ubuntu.com/ubuntu noble InRelease
2026-02-15T03:54:08.2194039Z Get:3 http://azure.archive.ubuntu.com/ubuntu noble-updates InRelease [126 kB]
2026-02-15T03:54:08.2234763Z Get:4 http://azure.archive.ubuntu.com/ubuntu noble-backports InRelease [126 kB]
2026-02-15T03:54:08.2275743Z Get:5 http://azure.archive.ubuntu.com/ubuntu noble-security InRelease [126 kB]
2026-02-15T03:54:08.2983086Z Get:8 https://packages.microsoft.com/repos/azure-cli noble/main amd64 Packages [2129 B]
2026-02-15T03:54:08.3691389Z Get:9 https://packages.microsoft.com/ubuntu/24.04/prod noble/main all Packages [643 B]
2026-02-15T03:54:08.3738936Z Get:10 https://packages.microsoft.com/ubuntu/24.04/prod noble/main arm64 Packages [69.0 kB]
2026-02-15T03:54:08.3785153Z Get:11 https://packages.microsoft.com/ubuntu/24.04/prod noble/main armhf Packages [11.4 kB]
2026-02-15T03:54:08.3829062Z Get:12 https://packages.microsoft.com/ubuntu/24.04/prod noble/main amd64 Packages [89.5 kB]
2026-02-15T03:54:08.4901216Z Get:13 http://azure.archive.ubuntu.com/ubuntu noble-updates/main amd64 Packages [1742 kB]
2026-02-15T03:54:08.5019071Z Get:14 http://azure.archive.ubuntu.com/ubuntu noble-updates/main Translation-en [325 kB]
2026-02-15T03:54:08.5052853Z Get:15 http://azure.archive.ubuntu.com/ubuntu noble-updates/main amd64 Components [175 kB]
2026-02-15T03:54:08.5083712Z Get:16 http://azure.archive.ubuntu.com/ubuntu noble-updates/main amd64 c-n-f Metadata [16.5 kB]
2026-02-15T03:54:08.5131058Z Get:17 http://azure.archive.ubuntu.com/ubuntu noble-updates/universe amd64 Packages [1529 kB]
2026-02-15T03:54:08.5307224Z Get:18 http://azure.archive.ubuntu.com/ubuntu noble-updates/universe Translation-en [313 kB]
2026-02-15T03:54:08.5401691Z Get:19 http://azure.archive.ubuntu.com/ubuntu noble-updates/universe amd64 Components [386 kB]
2026-02-15T03:54:08.5447063Z Get:20 http://azure.archive.ubuntu.com/ubuntu noble-updates/universe amd64 c-n-f Metadata [31.9 kB]
2026-02-15T03:54:08.5491596Z Get:21 http://azure.archive.ubuntu.com/ubuntu noble-updates/restricted amd64 Packages [2594 kB]
2026-02-15T03:54:08.5831707Z Get:22 http://azure.archive.ubuntu.com/ubuntu noble-updates/restricted Translation-en [595 kB]
2026-02-15T03:54:08.6305802Z Get:23 http://azure.archive.ubuntu.com/ubuntu noble-updates/restricted amd64 Components [212 B]
2026-02-15T03:54:08.6326105Z Get:24 http://azure.archive.ubuntu.com/ubuntu noble-updates/multiverse amd64 Components [940 B]
2026-02-15T03:54:08.6348559Z Get:25 http://azure.archive.ubuntu.com/ubuntu noble-backports/main amd64 Components [7312 B]
2026-02-15T03:54:08.6373857Z Get:26 http://azure.archive.ubuntu.com/ubuntu noble-backports/universe amd64 Components [10.5 kB]
2026-02-15T03:54:08.6375627Z Get:27 http://azure.archive.ubuntu.com/ubuntu noble-backports/restricted amd64 Components [212 B]
2026-02-15T03:54:08.6382446Z Get:28 http://azure.archive.ubuntu.com/ubuntu noble-backports/multiverse amd64 Components [212 B]
2026-02-15T03:54:08.7376272Z Get:29 http://azure.archive.ubuntu.com/ubuntu noble-security/main amd64 Packages [1448 kB]
2026-02-15T03:54:08.7473820Z Get:30 http://azure.archive.ubuntu.com/ubuntu noble-security/main Translation-en [234 kB]
2026-02-15T03:54:08.7484660Z Get:31 http://azure.archive.ubuntu.com/ubuntu noble-security/main amd64 Components [21.5 kB]
2026-02-15T03:54:08.7508329Z Get:32 http://azure.archive.ubuntu.com/ubuntu noble-security/main amd64 c-n-f Metadata [9892 B]
2026-02-15T03:54:08.7533326Z Get:33 http://azure.archive.ubuntu.com/ubuntu noble-security/universe amd64 Packages [930 kB]
2026-02-15T03:54:08.7601103Z Get:34 http://azure.archive.ubuntu.com/ubuntu noble-security/universe Translation-en [212 kB]
2026-02-15T03:54:08.7632672Z Get:35 http://azure.archive.ubuntu.com/ubuntu noble-security/universe amd64 Components [74.3 kB]
2026-02-15T03:54:08.7652634Z Get:36 http://azure.archive.ubuntu.com/ubuntu noble-security/universe amd64 c-n-f Metadata [19.9 kB]
2026-02-15T03:54:08.8111276Z Get:37 http://azure.archive.ubuntu.com/ubuntu noble-security/restricted amd64 Packages [2452 kB]
2026-02-15T03:54:08.8426221Z Get:38 http://azure.archive.ubuntu.com/ubuntu noble-security/restricted Translation-en [564 kB]
2026-02-15T03:54:08.8490462Z Get:39 http://azure.archive.ubuntu.com/ubuntu noble-security/restricted amd64 Components [212 B]
2026-02-15T03:54:08.8530932Z Get:40 http://azure.archive.ubuntu.com/ubuntu noble-security/multiverse amd64 Components [208 B]
2026-02-15T03:54:14.9968861Z Fetched 14.3 MB in 2s (7091 kB/s)
2026-02-15T03:54:15.7935162Z Reading package lists...
2026-02-15T03:54:15.8222040Z Reading package lists...
2026-02-15T03:54:16.0441146Z Building dependency tree...
2026-02-15T03:54:16.0500802Z Reading state information...
2026-02-15T03:54:16.2561891Z libasound2t64 is already the newest version (1.2.11-1ubuntu0.1).
2026-02-15T03:54:16.2566914Z libasound2t64 set to manually installed.
2026-02-15T03:54:16.2572293Z libatk-bridge2.0-0t64 is already the newest version (2.52.0-1build1).
2026-02-15T03:54:16.2619299Z libatk-bridge2.0-0t64 set to manually installed.
2026-02-15T03:54:16.2624218Z libatk1.0-0t64 is already the newest version (2.52.0-1build1).
2026-02-15T03:54:16.2628491Z libatk1.0-0t64 set to manually installed.
2026-02-15T03:54:16.2632953Z libatspi2.0-0t64 is already the newest version (2.52.0-1build1).
2026-02-15T03:54:16.2637221Z libatspi2.0-0t64 set to manually installed.
2026-02-15T03:54:16.2641820Z libcairo2 is already the newest version (1.18.0-3build1).
2026-02-15T03:54:16.2646042Z libcairo2 set to manually installed.
2026-02-15T03:54:16.2650509Z libcups2t64 is already the newest version (2.4.7-1.2ubuntu7.9).
2026-02-15T03:54:16.2654594Z libcups2t64 set to manually installed.
2026-02-15T03:54:16.2657622Z libdbus-1-3 is already the newest version (1.14.10-4ubuntu4.1).
2026-02-15T03:54:16.2660783Z libdbus-1-3 set to manually installed.
2026-02-15T03:54:16.2663866Z libdrm2 is already the newest version (2.4.125-1ubuntu0.1~24.04.1).
2026-02-15T03:54:16.2666873Z libdrm2 set to manually installed.
2026-02-15T03:54:16.2670026Z libgbm1 is already the newest version (25.2.8-0ubuntu0.24.04.1).
2026-02-15T03:54:16.2672369Z libgbm1 set to manually installed.
2026-02-15T03:54:16.2678221Z libnspr4 is already the newest version (2:4.35-1.1build1).
2026-02-15T03:54:16.2678862Z libnspr4 set to manually installed.
2026-02-15T03:54:16.2689399Z libnss3 is already the newest version (2:3.98-1build1).
2026-02-15T03:54:16.2690202Z libnss3 set to manually installed.
2026-02-15T03:54:16.2690898Z libpango-1.0-0 is already the newest version (1.52.1+ds-1build1).
2026-02-15T03:54:16.2691577Z libpango-1.0-0 set to manually installed.
2026-02-15T03:54:16.2692240Z libx11-6 is already the newest version (2:1.8.7-1build1).
2026-02-15T03:54:16.2692832Z libx11-6 set to manually installed.
2026-02-15T03:54:16.2693432Z libxcb1 is already the newest version (1.15-1ubuntu2).
2026-02-15T03:54:16.2694015Z libxcb1 set to manually installed.
2026-02-15T03:54:16.2694699Z libxcomposite1 is already the newest version (1:0.4.5-1build3).
2026-02-15T03:54:16.2695384Z libxcomposite1 set to manually installed.
2026-02-15T03:54:16.2696074Z libxdamage1 is already the newest version (1:1.1.6-1build1).
2026-02-15T03:54:16.2696713Z libxdamage1 set to manually installed.
2026-02-15T03:54:16.2697361Z libxext6 is already the newest version (2:1.3.4-1build2).
2026-02-15T03:54:16.2697972Z libxext6 set to manually installed.
2026-02-15T03:54:16.2698985Z libxfixes3 is already the newest version (1:6.0.0-2build1).
2026-02-15T03:54:16.2699632Z libxfixes3 set to manually installed.
2026-02-15T03:54:16.2700469Z libxkbcommon0 is already the newest version (1.6.0-1build1).
2026-02-15T03:54:16.2701400Z libxkbcommon0 set to manually installed.
2026-02-15T03:54:16.2702079Z libxrandr2 is already the newest version (2:1.5.2-2build1).
2026-02-15T03:54:16.2702714Z libxrandr2 set to manually installed.
2026-02-15T03:54:16.2703366Z xvfb is already the newest version (2:21.1.12-1ubuntu1.5).
2026-02-15T03:54:16.2704255Z fonts-noto-color-emoji is already the newest version (2.047-0ubuntu0.24.04.1).
2026-02-15T03:54:16.2705212Z libfontconfig1 is already the newest version (2.15.0-1.1ubuntu2).
2026-02-15T03:54:16.2705934Z libfontconfig1 set to manually installed.
2026-02-15T03:54:16.2706682Z libfreetype6 is already the newest version (2.13.2+dfsg-1build3).
2026-02-15T03:54:16.2707388Z libfreetype6 set to manually installed.
2026-02-15T03:54:16.2708092Z fonts-liberation is already the newest version (1:2.1.5-3).
2026-02-15T03:54:16.2708781Z fonts-liberation set to manually installed.
2026-02-15T03:54:16.2709437Z The following additional packages will be installed:
2026-02-15T03:54:16.2710425Z   gir1.2-glib-2.0 libglib2.0-bin libglib2.0-data xfonts-encodings xfonts-utils
2026-02-15T03:54:16.2711123Z Suggested packages:
2026-02-15T03:54:16.2711493Z   low-memory-monitor
2026-02-15T03:54:16.2711868Z Recommended packages:
2026-02-15T03:54:16.2712330Z   fonts-ipafont-mincho fonts-tlwg-loma
2026-02-15T03:54:16.2853992Z The following NEW packages will be installed:
2026-02-15T03:54:16.2857059Z   fonts-freefont-ttf fonts-ipafont-gothic fonts-tlwg-loma-otf fonts-unifont
2026-02-15T03:54:16.2865811Z   fonts-wqy-zenhei xfonts-cyrillic xfonts-encodings xfonts-scalable
2026-02-15T03:54:16.2866718Z   xfonts-utils
2026-02-15T03:54:16.2871787Z The following packages will be upgraded:
2026-02-15T03:54:16.2879884Z   gir1.2-glib-2.0 libglib2.0-0t64 libglib2.0-bin libglib2.0-data
2026-02-15T03:54:16.3070633Z 4 upgraded, 9 newly installed, 0 to remove and 14 not upgraded.
2026-02-15T03:54:16.3072618Z Need to get 23.0 MB of archives.
2026-02-15T03:54:16.3073619Z After this operation, 79.5 MB of additional disk space will be used.
2026-02-15T03:54:16.3074796Z Get:1 file:/etc/apt/apt-mirrors.txt Mirrorlist [144 B]
2026-02-15T03:54:16.3551284Z Get:2 http://azure.archive.ubuntu.com/ubuntu noble/universe amd64 fonts-ipafont-gothic all 00303-21ubuntu1 [3513 kB]
2026-02-15T03:54:16.4273330Z Get:3 http://azure.archive.ubuntu.com/ubuntu noble-updates/main amd64 libglib2.0-data all 2.80.0-6ubuntu3.8 [49.6 kB]
2026-02-15T03:54:16.4578717Z Get:4 http://azure.archive.ubuntu.com/ubuntu noble-updates/main amd64 libglib2.0-bin amd64 2.80.0-6ubuntu3.8 [97.9 kB]
2026-02-15T03:54:16.4891555Z Get:5 http://azure.archive.ubuntu.com/ubuntu noble-updates/main amd64 gir1.2-glib-2.0 amd64 2.80.0-6ubuntu3.8 [183 kB]
2026-02-15T03:54:16.5515239Z Get:6 http://azure.archive.ubuntu.com/ubuntu noble-updates/main amd64 libglib2.0-0t64 amd64 2.80.0-6ubuntu3.8 [1545 kB]
2026-02-15T03:54:16.7759652Z Get:7 http://azure.archive.ubuntu.com/ubuntu noble/main amd64 fonts-freefont-ttf all 20211204+svn4273-2 [5641 kB]
2026-02-15T03:54:16.8788760Z Get:8 http://azure.archive.ubuntu.com/ubuntu noble/universe amd64 fonts-tlwg-loma-otf all 1:0.7.3-1 [107 kB]
2026-02-15T03:54:16.9092252Z Get:9 http://azure.archive.ubuntu.com/ubuntu noble/universe amd64 fonts-unifont all 1:15.1.01-1build1 [2993 kB]
2026-02-15T03:54:16.9749139Z Get:10 http://azure.archive.ubuntu.com/ubuntu noble/universe amd64 fonts-wqy-zenhei all 0.9.45-8 [7472 kB]
2026-02-15T03:54:17.1150692Z Get:11 http://azure.archive.ubuntu.com/ubuntu noble/main amd64 xfonts-encodings all 1:1.0.5-0ubuntu2 [578 kB]
2026-02-15T03:54:17.1506388Z Get:12 http://azure.archive.ubuntu.com/ubuntu noble/main amd64 xfonts-utils amd64 1:7.7+6build3 [94.4 kB]
2026-02-15T03:54:17.1813699Z Get:13 http://azure.archive.ubuntu.com/ubuntu noble/universe amd64 xfonts-cyrillic all 1:1.0.5+nmu1 [384 kB]
2026-02-15T03:54:17.2175577Z Get:14 http://azure.archive.ubuntu.com/ubuntu noble/main amd64 xfonts-scalable all 1:1.0.3-1.3 [304 kB]
2026-02-15T03:54:17.5240010Z Fetched 23.0 MB in 1s (24.7 MB/s)
2026-02-15T03:54:17.5496713Z Selecting previously unselected package fonts-ipafont-gothic.
2026-02-15T03:54:17.5773848Z (Reading database ... 
2026-02-15T03:54:17.5775067Z (Reading database ... 5%
2026-02-15T03:54:17.5775845Z (Reading database ... 10%
2026-02-15T03:54:17.5776307Z (Reading database ... 15%
2026-02-15T03:54:17.5776655Z (Reading database ... 20%
2026-02-15T03:54:17.5776932Z (Reading database ... 25%
2026-02-15T03:54:17.5777277Z (Reading database ... 30%
2026-02-15T03:54:17.5777853Z (Reading database ... 35%
2026-02-15T03:54:17.5778477Z (Reading database ... 40%
2026-02-15T03:54:17.5778970Z (Reading database ... 45%
2026-02-15T03:54:17.5779247Z (Reading database ... 50%
2026-02-15T03:54:17.5857071Z (Reading database ... 55%
2026-02-15T03:54:17.6321773Z (Reading database ... 60%
2026-02-15T03:54:17.6698441Z (Reading database ... 65%
2026-02-15T03:54:17.7055646Z (Reading database ... 70%
2026-02-15T03:54:17.7424732Z (Reading database ... 75%
2026-02-15T03:54:17.8005355Z (Reading database ... 80%
2026-02-15T03:54:17.9383588Z (Reading database ... 85%
2026-02-15T03:54:18.0856352Z (Reading database ... 90%
2026-02-15T03:54:18.1857427Z (Reading database ... 95%
2026-02-15T03:54:18.1858597Z (Reading database ... 100%
2026-02-15T03:54:18.1861052Z (Reading database ... 218331 files and directories currently installed.)
2026-02-15T03:54:18.1904841Z Preparing to unpack .../00-fonts-ipafont-gothic_00303-21ubuntu1_all.deb ...
2026-02-15T03:54:18.1995864Z Unpacking fonts-ipafont-gothic (00303-21ubuntu1) ...
2026-02-15T03:54:18.4563258Z Preparing to unpack .../01-libglib2.0-data_2.80.0-6ubuntu3.8_all.deb ...
2026-02-15T03:54:18.4591321Z Unpacking libglib2.0-data (2.80.0-6ubuntu3.8) over (2.80.0-6ubuntu3.7) ...
2026-02-15T03:54:18.4983175Z Preparing to unpack .../02-libglib2.0-bin_2.80.0-6ubuntu3.8_amd64.deb ...
2026-02-15T03:54:18.5006446Z Unpacking libglib2.0-bin (2.80.0-6ubuntu3.8) over (2.80.0-6ubuntu3.7) ...
2026-02-15T03:54:18.5542438Z Preparing to unpack .../03-gir1.2-glib-2.0_2.80.0-6ubuntu3.8_amd64.deb ...
2026-02-15T03:54:18.5564895Z Unpacking gir1.2-glib-2.0:amd64 (2.80.0-6ubuntu3.8) over (2.80.0-6ubuntu3.7) ...
2026-02-15T03:54:18.6034614Z Preparing to unpack .../04-libglib2.0-0t64_2.80.0-6ubuntu3.8_amd64.deb ...
2026-02-15T03:54:18.6140319Z Unpacking libglib2.0-0t64:amd64 (2.80.0-6ubuntu3.8) over (2.80.0-6ubuntu3.7) ...
2026-02-15T03:54:18.6642654Z Selecting previously unselected package fonts-freefont-ttf.
2026-02-15T03:54:18.6805650Z Preparing to unpack .../05-fonts-freefont-ttf_20211204+svn4273-2_all.deb ...
2026-02-15T03:54:18.6815192Z Unpacking fonts-freefont-ttf (20211204+svn4273-2) ...
2026-02-15T03:54:18.7720494Z Selecting previously unselected package fonts-tlwg-loma-otf.
2026-02-15T03:54:18.7883095Z Preparing to unpack .../06-fonts-tlwg-loma-otf_1%3a0.7.3-1_all.deb ...
2026-02-15T03:54:18.7891544Z Unpacking fonts-tlwg-loma-otf (1:0.7.3-1) ...
2026-02-15T03:54:18.8110758Z Selecting previously unselected package fonts-unifont.
2026-02-15T03:54:18.8268495Z Preparing to unpack .../07-fonts-unifont_1%3a15.1.01-1build1_all.deb ...
2026-02-15T03:54:18.8278073Z Unpacking fonts-unifont (1:15.1.01-1build1) ...
2026-02-15T03:54:18.9556330Z Selecting previously unselected package fonts-wqy-zenhei.
2026-02-15T03:54:18.9714741Z Preparing to unpack .../08-fonts-wqy-zenhei_0.9.45-8_all.deb ...
2026-02-15T03:54:18.9822137Z Unpacking fonts-wqy-zenhei (0.9.45-8) ...
2026-02-15T03:54:19.4569005Z Selecting previously unselected package xfonts-encodings.
2026-02-15T03:54:19.4731265Z Preparing to unpack .../09-xfonts-encodings_1%3a1.0.5-0ubuntu2_all.deb ...
2026-02-15T03:54:19.4740502Z Unpacking xfonts-encodings (1:1.0.5-0ubuntu2) ...
2026-02-15T03:54:19.5063490Z Selecting previously unselected package xfonts-utils.
2026-02-15T03:54:19.5223501Z Preparing to unpack .../10-xfonts-utils_1%3a7.7+6build3_amd64.deb ...
2026-02-15T03:54:19.5232767Z Unpacking xfonts-utils (1:7.7+6build3) ...
2026-02-15T03:54:19.5631024Z Selecting previously unselected package xfonts-cyrillic.
2026-02-15T03:54:19.5791757Z Preparing to unpack .../11-xfonts-cyrillic_1%3a1.0.5+nmu1_all.deb ...
2026-02-15T03:54:19.5801229Z Unpacking xfonts-cyrillic (1:1.0.5+nmu1) ...
2026-02-15T03:54:19.6185792Z Selecting previously unselected package xfonts-scalable.
2026-02-15T03:54:19.6364681Z Preparing to unpack .../12-xfonts-scalable_1%3a1.0.3-1.3_all.deb ...
2026-02-15T03:54:19.6379459Z Unpacking xfonts-scalable (1:1.0.3-1.3) ...
2026-02-15T03:54:19.6931091Z Setting up fonts-wqy-zenhei (0.9.45-8) ...
2026-02-15T03:54:19.7066702Z Setting up fonts-freefont-ttf (20211204+svn4273-2) ...
2026-02-15T03:54:19.7088954Z Setting up libglib2.0-0t64:amd64 (2.80.0-6ubuntu3.8) ...
2026-02-15T03:54:19.7218108Z Setting up libglib2.0-data (2.80.0-6ubuntu3.8) ...
2026-02-15T03:54:19.7240415Z Setting up fonts-tlwg-loma-otf (1:0.7.3-1) ...
2026-02-15T03:54:19.7263094Z Setting up xfonts-encodings (1:1.0.5-0ubuntu2) ...
2026-02-15T03:54:19.7283565Z Setting up gir1.2-glib-2.0:amd64 (2.80.0-6ubuntu3.8) ...
2026-02-15T03:54:19.7306916Z Setting up fonts-ipafont-gothic (00303-21ubuntu1) ...
2026-02-15T03:54:19.7375644Z update-alternatives: using /usr/share/fonts/opentype/ipafont-gothic/ipag.ttf to provide /usr/share/fonts/truetype/fonts-japanese-gothic.ttf (fonts-japanese-gothic.ttf) in auto mode
2026-02-15T03:54:19.7393248Z Setting up fonts-unifont (1:15.1.01-1build1) ...
2026-02-15T03:54:19.7415056Z Setting up libglib2.0-bin (2.80.0-6ubuntu3.8) ...
2026-02-15T03:54:19.7436598Z Setting up xfonts-utils (1:7.7+6build3) ...
2026-02-15T03:54:19.7481269Z Setting up xfonts-cyrillic (1:1.0.5+nmu1) ...
2026-02-15T03:54:19.7979431Z Setting up xfonts-scalable (1:1.0.3-1.3) ...
2026-02-15T03:54:19.8521173Z Processing triggers for libc-bin (2.39-0ubuntu8.7) ...
2026-02-15T03:54:19.8868997Z Processing triggers for man-db (2.12.0-4build2) ...
2026-02-15T03:54:19.8894756Z Not building database; man-db/auto-update is not 'true'.
2026-02-15T03:54:19.8910735Z Processing triggers for fontconfig (2.15.0-1.1ubuntu2) ...
2026-02-15T03:54:21.0402827Z 
2026-02-15T03:54:21.0403841Z Running kernel seems to be up-to-date.
2026-02-15T03:54:21.0404617Z 
2026-02-15T03:54:21.0406393Z Restarting services...
2026-02-15T03:54:21.0904405Z  systemctl restart packagekit.service php8.3-fpm.service polkit.service udisks2.service
2026-02-15T03:54:21.3105627Z 
2026-02-15T03:54:21.3108082Z Service restarts being deferred:
2026-02-15T03:54:21.3111055Z  systemctl restart ModemManager.service
2026-02-15T03:54:21.3114168Z  systemctl restart networkd-dispatcher.service
2026-02-15T03:54:21.3117736Z 
2026-02-15T03:54:21.3118231Z No containers need to be restarted.
2026-02-15T03:54:21.3118938Z 
2026-02-15T03:54:21.3119460Z No user sessions are running outdated binaries.
2026-02-15T03:54:21.3120417Z 
2026-02-15T03:54:21.3120960Z No VM guests are running outdated hypervisor (qemu) binaries on this host.
2026-02-15T03:54:22.2457257Z Downloading Chromium 143.0.7499.4 (playwright build v1200) from https://cdn.playwright.dev/dbazure/download/playwright/builds/chromium/1200/chromium-linux.zip
2026-02-15T03:54:22.5291119Z |                                                                                |   0% of 164.7 MiB
2026-02-15T03:54:22.8878234Z |■■■■■■■■                                                                        |  10% of 164.7 MiB
2026-02-15T03:54:23.0551859Z |■■■■■■■■■■■■■■■■                                                                |  20% of 164.7 MiB
2026-02-15T03:54:23.1951643Z |■■■■■■■■■■■■■■■■■■■■■■■■                                                        |  30% of 164.7 MiB
2026-02-15T03:54:23.3185572Z |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                                |  40% of 164.7 MiB
2026-02-15T03:54:23.4473131Z |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                        |  50% of 164.7 MiB
2026-02-15T03:54:23.5702947Z |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                |  60% of 164.7 MiB
2026-02-15T03:54:23.6952280Z |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                        |  70% of 164.7 MiB
2026-02-15T03:54:23.8184720Z |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                |  80% of 164.7 MiB
2026-02-15T03:54:23.9444361Z |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■        |  90% of 164.7 MiB
2026-02-15T03:54:24.0685346Z |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■| 100% of 164.7 MiB
2026-02-15T03:54:28.3785904Z Chromium 143.0.7499.4 (playwright build v1200) downloaded to /home/runner/.cache/ms-playwright/chromium-1200
2026-02-15T03:54:28.3792784Z Downloading FFMPEG playwright build v1011 from https://cdn.playwright.dev/dbazure/download/playwright/builds/ffmpeg/1011/ffmpeg-linux.zip
2026-02-15T03:54:28.6604213Z |                                                                                |   0% of 2.3 MiB
2026-02-15T03:54:28.7110665Z |■■■■■■■■                                                                        |  10% of 2.3 MiB
2026-02-15T03:54:28.7320861Z |■■■■■■■■■■■■■■■■                                                                |  20% of 2.3 MiB
2026-02-15T03:54:28.7468389Z |■■■■■■■■■■■■■■■■■■■■■■■■                                                        |  30% of 2.3 MiB
2026-02-15T03:54:28.7565446Z |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                                |  40% of 2.3 MiB
2026-02-15T03:54:28.7687442Z |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                        |  50% of 2.3 MiB
2026-02-15T03:54:28.7718813Z |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                |  60% of 2.3 MiB
2026-02-15T03:54:28.7753637Z |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                        |  70% of 2.3 MiB
2026-02-15T03:54:28.7808605Z |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                |  80% of 2.3 MiB
2026-02-15T03:54:28.7839240Z |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■        |  90% of 2.3 MiB
2026-02-15T03:54:28.7911897Z |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■| 100% of 2.3 MiB
2026-02-15T03:54:28.8794584Z FFMPEG playwright build v1011 downloaded to /home/runner/.cache/ms-playwright/ffmpeg-1011
2026-02-15T03:54:28.8798593Z Downloading Chromium Headless Shell 143.0.7499.4 (playwright build v1200) from https://cdn.playwright.dev/dbazure/download/playwright/builds/chromium/1200/chromium-headless-shell-linux.zip
2026-02-15T03:54:29.1454041Z |                                                                                |   0% of 109.7 MiB
2026-02-15T03:54:29.4286816Z |■■■■■■■■                                                                        |  10% of 109.7 MiB
2026-02-15T03:54:29.5406968Z |■■■■■■■■■■■■■■■■                                                                |  20% of 109.7 MiB
2026-02-15T03:54:29.6474875Z |■■■■■■■■■■■■■■■■■■■■■■■■                                                        |  30% of 109.7 MiB
2026-02-15T03:54:29.7421179Z |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                                |  40% of 109.7 MiB
2026-02-15T03:54:29.8242303Z |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                        |  50% of 109.7 MiB
2026-02-15T03:54:29.9165826Z |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                |  60% of 109.7 MiB
2026-02-15T03:54:30.0085582Z |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                        |  70% of 109.7 MiB
2026-02-15T03:54:30.1000228Z |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                |  80% of 109.7 MiB
2026-02-15T03:54:30.1929597Z |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■        |  90% of 109.7 MiB
2026-02-15T03:54:30.2817975Z |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■| 100% of 109.7 MiB
2026-02-15T03:54:33.3719034Z Chromium Headless Shell 143.0.7499.4 (playwright build v1200) downloaded to /home/runner/.cache/ms-playwright/chromium_headless_shell-1200
2026-02-15T03:54:33.3945580Z ##[group]Run rm -rf videos/
2026-02-15T03:54:33.3945904Z [36;1mrm -rf videos/[0m
2026-02-15T03:54:33.3994629Z shell: /usr/bin/bash -e {0}
2026-02-15T03:54:33.3994908Z ##[endgroup]
2026-02-15T03:54:33.4190896Z ##[group]Run npx --yes tsx scripts/run-search.ts MANUAL 11b68a27-1c0c-4a85-a589-42c16c81a97b
2026-02-15T03:54:33.4191605Z [36;1mnpx --yes tsx scripts/run-search.ts MANUAL 11b68a27-1c0c-4a85-a589-42c16c81a97b[0m
2026-02-15T03:54:33.4235102Z shell: /usr/bin/bash -e {0}
2026-02-15T03:54:33.4235364Z env:
2026-02-15T03:54:33.4235934Z   NEXT_PUBLIC_SUPABASE_URL: ***
2026-02-15T03:54:33.4237292Z   SUPABASE_SERVICE_ROLE_KEY: ***
2026-02-15T03:54:33.4237590Z   BRIGHT_DATA_HOST: ***
2026-02-15T03:54:33.4237860Z   BRIGHT_DATA_PORT: ***
2026-02-15T03:54:33.4238213Z   BRIGHT_DATA_USERNAME: ***
2026-02-15T03:54:33.4238483Z   BRIGHT_DATA_PASSWORD: ***
2026-02-15T03:54:33.4238726Z ##[endgroup]
2026-02-15T03:54:34.2224459Z ⚠️  Node.js 18 and below are deprecated and will no longer be supported in future versions of @supabase/supabase-js. Please upgrade to Node.js 20 or later. For more information, visit: https://github.com/orgs/supabase/discussions/37217
2026-02-15T03:54:34.8416801Z [Worker] Starting in mode: MANUAL
2026-02-15T03:54:35.7120851Z [Worker] Processing Search ID: 11b68a27-1c0c-4a85-a589-42c16c81a97b (Platform: naver)
2026-02-15T03:54:35.9895653Z [Worker] Generating tasks for 3 grid points x 1 keywords
2026-02-15T03:54:35.9897433Z [Worker] Starting Naver Scrape for 효뜨 (3 tasks)...
2026-02-15T03:54:35.9904352Z [Scraper Ex2] Starting V6 Batch (Single Session): 3 tasks
2026-02-15T03:54:36.6441225Z [Scraper Ex2] 🛡️ Proxy Active (Fixed Session: 7ffo6)
2026-02-15T03:54:52.1520968Z [Scraper Ex2] ⏳ Page loaded. Waiting for JS initialization...
2026-02-15T03:54:57.1561820Z [Scraper Ex2] ⏳ Waiting for map scale indicator (Render Check)...
2026-02-15T03:55:27.1650602Z [Scraper Ex2] ⚠️ Scale indicator not found. Reloading page...
2026-02-15T03:55:44.4361605Z [Scraper Ex2] 🔄 Page reloaded. Continuing...
2026-02-15T03:55:44.4403419Z [Scraper Ex2] 🗺️ Phase 1: Waiting for initial map tile rendering...
2026-02-15T03:55:44.4420857Z [Scraper Ex2] ⏳ Waiting for map tiles... (0s / 120s, count: 34)
2026-02-15T03:55:49.4416465Z [Scraper Ex2] ✅ Map tiles detected! (242 tile requests since check started)
2026-02-15T03:55:49.4419115Z [Scraper Ex2] ✅ Map ready! Proceeding with scraping...
2026-02-15T03:55:52.2869474Z [Scraper Ex2] 🔥 Warmup run for Task 1 (result will be discarded)...
2026-02-15T03:55:54.3205003Z [Scraper Ex2] ⏳ Waiting for map scale indicator (Render Check)...
2026-02-15T03:55:54.3407751Z [Scraper Ex2] 🗺️ Map fully rendered (Scale indicator found)
2026-02-15T03:55:54.3416665Z [Scraper Ex2] 📍 Moving to (37.528738, 126.970145)...
2026-02-15T03:55:58.2051084Z [Scraper Ex2] 🖱️ Move Attempt 1/5: Pressing Enter...
2026-02-15T03:56:03.5060758Z [Scraper Ex2] ⚠️ Move Verification Failed (URL not changed). Retrying...
2026-02-15T03:56:08.5056947Z [Scraper Ex2] 🖱️ Move Attempt 2/5: Pressing Enter...
2026-02-15T03:56:13.7995881Z [Scraper Ex2] ⚠️ Move Verification Failed (URL not changed). Retrying...
2026-02-15T03:56:18.8021519Z [Scraper Ex2] 🖱️ Move Attempt 3/5: Pressing Enter...
2026-02-15T03:56:21.0577312Z [Scraper Ex2] 🚀 Move Verified! (URL changed to /entry/)
2026-02-15T03:56:21.0578708Z [Scraper Ex2] ⏳ Waiting for location context to settle...
2026-02-15T03:56:29.4609107Z [DEBUG] allSearch 1st item keys: {
2026-02-15T03:56:29.4620906Z   "index": "0",
2026-02-15T03:56:29.4622037Z   "rank": "1",
2026-02-15T03:56:29.4623096Z   "id": "1813533684",
2026-02-15T03:56:29.4625046Z   "name": "효뜨",
2026-02-15T03:56:29.4626073Z   "tel": "0507-1320-2549",
2026-02-15T03:56:29.4626576Z   "isCallLink": false,
2026-02-15T03:56:29.4627032Z   "virtualTel": "0507-1320-2549",
2026-02-15T03:56:29.4630194Z   "virtualTelDisplay": "0507-1320-2549",
2026-02-15T03:56:29.4630718Z   "ppc": "1",
2026-02-15T03:56:29.4631075Z   "category": [
2026-02-15T03:56:29.4631532Z     "음식점",
2026-02-15T03:56:29.4631902Z     "베트남음식"
2026-02-15T03:56:29.4632213Z   ],
2026-02-15T03:56:29.4632532Z   "categoryPath": [
2026-02-15T03:56:29.4632902Z     [
2026-02-15T03:56:29.4633235Z       "220036",
2026-02-15T03:56:29.4633558Z       "220041",
2026-02-15T03:56:29.4634366Z       "220103"
2026-02-15T03:56:29.4634711Z     ],
2026-02-15T03:56:29.4635013Z     [
2026-02-15T03:56:29.4635316Z       "1004760",
2026-02-15T03:56:29.4635660Z       "1004380",
2026-02-15T03:56:29.4635983Z       "1002043"
2026-02-15T03:56:29.4636303Z     ]
2026-02-15T03:56:29.4636598Z   ],
2026-02-15T03:56:29.4636880Z   "rcode": "09170127",
2026-02-15T03:56:29.4637253Z   "businessStatus": {
2026-02-15T03:56:29.4637690Z     "requestTime": "202602151256",
2026-02-15T03:56:29.4638135Z     "status": {
2026-02-15T03:56:29.4638482Z       "code": 2,
2026-02-15T03:56:29.4638910Z       "text": "영업 중",
2026-02-15T03:56:29.4639298Z       "emphasis": false,
2026-02-15T03:56:29.4640889Z       "description": "영업중",
2026-02-15T03:56:29.4642192Z       "detailInfo": "15:15에 브레이크타임"
2026-02-15T03:56:29.4642649Z     },
2026-02-15T03:56:29.4644514Z     "businessHours": "202602151130~202602152200",
2026-02-15T03:56:29.4647339Z     "breakTime": "202602151515~202602151700",
2026-02-15T03:56:29.4647928Z     "lastOrder": "202602152100"
2026-02-15T03:56:29.4648340Z   },
2026-02-15T03:56:29.4649650Z   "naviInfoText": null,
2026-02-15T03:56:29.4650346Z   "naviInfo": null,
2026-02-15T03:56:29.4650937Z   "address": "서울특별시 용산구 용산동5가 2-28 1층",
2026-02-15T03:56:29.4651597Z   "roadAddress": "서울특별시 용산구 한강대로38길 35 1층",
2026-02-15T03:56:29.4652222Z   "abbrAddress": "용산동5가 2-28 1층",
2026-02-15T03:56:29.4652667Z   "shortAddress": [
2026-02-15T03:56:29.4653091Z     "서울 용산구",
2026-02-15T03:56:29.4653476Z     "한강대로38길 35",
2026-02-15T03:56:29.4653851Z     "1층"
2026-02-15T03:56:29.4654155Z   ],
2026-02-15T03:56:29.4654523Z   "display": "효뜨",
2026-02-15T03:56:29.4654936Z   "telDisplay": "0507-1320-2549",
2026-02-15T03:56:29.4655375Z   "context": [],
2026-02-15T03:56:29.4655738Z   "reviewCount": 3559,
2026-02-15T03:56:29.4656141Z   "placeReviewCount": 2988,
2026-02-15T03:56:29.4656680Z   "ktCallMd": "db34269a131dc03ac40cb6b27db8f3bc",
2026-02-15T03:56:29.4657534Z   "coupon": "0",
2026-02-15T03:56:29.4658509Z   "thumUrl": "https://ldb-phinf.pstatic.net/20250519_273/1747633768501Vn3BJ_PNG/%BF%AC%BE%EE%BE%E4%BF%EE%BC%BE.png",
2026-02-15T03:56:29.4659460Z   "thumUrls": [
2026-02-15T03:56:29.4660784Z     "https://ldb-phinf.pstatic.net/20250519_273/1747633768501Vn3BJ_PNG/%BF%AC%BE%EE%BE%E4%BF%EE%BC%BE.png",
2026-02-15T03:56:29.4662170Z     "https://ldb-phinf.pstatic.net/20250519_261/1747633812036UrcBD_PNG/250429_%C8%BF%B6%DF-27.png",
2026-02-15T03:56:29.4663295Z     "https://ldb-phinf.pstatic.net/20250417_36/1744858810802sbW24_PNG/%F3%BC2.png"
2026-02-15T03:56:29.4663984Z   ],
2026-02-15T03:56:29.4664297Z   "type": "s",
2026-02-15T03:56:29.4664638Z   "isSite": "1",
2026-02-15T03:56:29.4664995Z   "posExact": "1",
2026-02-15T03:56:29.4665345Z   "x": "126.9701454",
2026-02-15T03:56:29.4665708Z   "y": "37.5287384",
2026-02-15T03:56:29.4666079Z   "itemLevel": "12",
2026-02-15T03:56:29.4666456Z   "isAdultBusiness": false,
2026-02-15T03:56:29.4666870Z   "streetPanorama": {
2026-02-15T03:56:29.4667325Z     "id": "NVVtkOUNLW9oJ0IUtS/Tcg==",
2026-02-15T03:56:29.4667800Z     "pan": "72.98",
2026-02-15T03:56:29.4668155Z     "tilt": "7.88",
2026-02-15T03:56:29.4668512Z     "lng": "126.9699485",
2026-02-15T03:56:29.4668901Z     "lat": "37.5287793",
2026-02-15T03:56:29.4669275Z     "fov": "45"
2026-02-15T03:56:29.4669599Z   },
2026-02-15T03:56:29.4670832Z   "skyPanorama": null,
2026-02-15T03:56:29.4671967Z   "insidePanorama": null,
2026-02-15T03:56:29.4674273Z   "interiorPanorama": null
2026-02-15T03:56:29.4677044Z [Scraper Ex2] 🎯 JSON HIT! Intercepted 20 items.
2026-02-15T03:56:30.5211314Z [Scraper Ex2] ✅ Warmup complete.
2026-02-15T03:56:30.9261009Z [Scraper Ex2] 🚀 Starting real Task 1...
2026-02-15T03:56:32.9612469Z [Scraper Ex2] ⏳ Waiting for map scale indicator (Render Check)...
2026-02-15T03:56:32.9668321Z [Scraper Ex2] 🗺️ Map fully rendered (Scale indicator found)
2026-02-15T03:56:32.9670942Z [Scraper Ex2] 📍 Moving to (37.528738, 126.970145)...
2026-02-15T03:56:36.6881305Z [Scraper Ex2] 🖱️ Move Attempt 1/5: Pressing Enter...
2026-02-15T03:56:39.5172842Z [Scraper Ex2] 🚀 Move Verified! (URL changed to /entry/)
2026-02-15T03:56:39.5177788Z [Scraper Ex2] ⏳ Waiting for location context to settle...
2026-02-15T03:56:45.8112449Z [Scraper Ex2] 🔎 Searching: "근처쌀국수" (Attempt 1/5)...
2026-02-15T03:56:47.6134040Z [DEBUG] allSearch 1st item keys: {
2026-02-15T03:56:47.6136965Z   "index": "0",
2026-02-15T03:56:47.6137305Z   "rank": "1",
2026-02-15T03:56:47.6137636Z   "id": "1813533684",
2026-02-15T03:56:47.6138221Z   "name": "효뜨",
2026-02-15T03:56:47.6138546Z   "tel": "0507-1320-2549",
2026-02-15T03:56:47.6138921Z   "isCallLink": false,
2026-02-15T03:56:47.6139327Z   "virtualTel": "0507-1320-2549",
2026-02-15T03:56:47.6140075Z   "virtualTelDisplay": "0507-1320-2549",
2026-02-15T03:56:47.6140523Z   "ppc": "1",
2026-02-15T03:56:47.6140836Z   "category": [
2026-02-15T03:56:47.6141214Z     "음식점",
2026-02-15T03:56:47.6141549Z     "베트남음식"
2026-02-15T03:56:47.6141841Z   ],
2026-02-15T03:56:47.6142173Z   "categoryPath": [
2026-02-15T03:56:47.6142496Z     [
2026-02-15T03:56:47.6142791Z       "220036",
2026-02-15T03:56:47.6143095Z       "220041",
2026-02-15T03:56:47.6143395Z       "220103"
2026-02-15T03:56:47.6143689Z     ],
2026-02-15T03:56:47.6143971Z     [
2026-02-15T03:56:47.6144249Z       "1004760",
2026-02-15T03:56:47.6144553Z       "1004380",
2026-02-15T03:56:47.6144856Z       "1002043"
2026-02-15T03:56:47.6145155Z     ]
2026-02-15T03:56:47.6145398Z   ],
2026-02-15T03:56:47.6145671Z   "rcode": "09170127",
2026-02-15T03:56:47.6146033Z   "businessStatus": {
2026-02-15T03:56:47.6146436Z     "requestTime": "202602151256",
2026-02-15T03:56:47.6146838Z     "status": {
2026-02-15T03:56:47.6147147Z       "code": 2,
2026-02-15T03:56:47.6147537Z       "text": "영업 중",
2026-02-15T03:56:47.6147896Z       "emphasis": false,
2026-02-15T03:56:47.6148347Z       "description": "영업중",
2026-02-15T03:56:47.6148865Z       "detailInfo": "15:15에 브레이크타임"
2026-02-15T03:56:47.6149268Z     },
2026-02-15T03:56:47.6157113Z     "businessHours": "202602151130~202602152200",
2026-02-15T03:56:47.6157727Z     "breakTime": "202602151515~202602151700",
2026-02-15T03:56:47.6158262Z     "lastOrder": "202602152100"
2026-02-15T03:56:47.6158689Z   },
2026-02-15T03:56:47.6159024Z   "naviInfoText": null,
2026-02-15T03:56:47.6159438Z   "naviInfo": null,
2026-02-15T03:56:47.6160393Z   "address": "서울특별시 용산구 용산동5가 2-28 1층",
2026-02-15T03:56:47.6161066Z   "roadAddress": "서울특별시 용산구 한강대로38길 35 1층",
2026-02-15T03:56:47.6161688Z   "abbrAddress": "용산동5가 2-28 1층",
2026-02-15T03:56:47.6162147Z   "shortAddress": [
2026-02-15T03:56:47.6162573Z     "서울 용산구",
2026-02-15T03:56:47.6162972Z     "한강대로38길 35",
2026-02-15T03:56:47.6163359Z     "1층"
2026-02-15T03:56:47.6163666Z   ],
2026-02-15T03:56:47.6164035Z   "display": "효뜨",
2026-02-15T03:56:47.6164457Z   "telDisplay": "0507-1320-2549",
2026-02-15T03:56:47.6164902Z   "context": [],
2026-02-15T03:56:47.6165263Z   "reviewCount": 3559,
2026-02-15T03:56:47.6165679Z   "placeReviewCount": 2988,
2026-02-15T03:56:47.6166278Z   "ktCallMd": "db34269a131dc03ac40cb6b27db8f3bc",
2026-02-15T03:56:47.6166827Z   "coupon": "0",
2026-02-15T03:56:47.6167778Z   "thumUrl": "https://ldb-phinf.pstatic.net/20250519_273/1747633768501Vn3BJ_PNG/%BF%AC%BE%EE%BE%E4%BF%EE%BC%BE.png",
2026-02-15T03:56:47.6168736Z   "thumUrls": [
2026-02-15T03:56:47.6169607Z     "https://ldb-phinf.pstatic.net/20250519_273/1747633768501Vn3BJ_PNG/%BF%AC%BE%EE%BE%E4%BF%EE%BC%BE.png",
2026-02-15T03:56:47.6171219Z     "https://ldb-phinf.pstatic.net/20250519_261/1747633812036UrcBD_PNG/250429_%C8%BF%B6%DF-27.png",
2026-02-15T03:56:47.6172350Z     "https://ldb-phinf.pstatic.net/20250417_36/1744858810802sbW24_PNG/%F3%BC2.png"
2026-02-15T03:56:47.6173043Z   ],
2026-02-15T03:56:47.6173360Z   "type": "s",
2026-02-15T03:56:47.6173702Z   "isSite": "1",
2026-02-15T03:56:47.6174058Z   "posExact": "1",
2026-02-15T03:56:47.6174418Z   "x": "126.9701454",
2026-02-15T03:56:47.6174784Z   "y": "37.5287384",
2026-02-15T03:56:47.6175149Z   "itemLevel": "12",
2026-02-15T03:56:47.6175548Z   "isAdultBusiness": false,
2026-02-15T03:56:47.6176071Z   "streetPanorama": {
2026-02-15T03:56:47.6176956Z     "id": "NVVtkOUNLW9oJ0IUtS/Tcg==",
2026-02-15T03:56:47.6177594Z     "pan": "72.98",
2026-02-15T03:56:47.6178247Z     "tilt": "7.88",
2026-02-15T03:56:47.6178756Z     "lng": "126.9699485",
2026-02-15T03:56:47.6179349Z     "lat": "37.5287793",
2026-02-15T03:56:47.6180086Z     "fov": "45"
2026-02-15T03:56:47.6180576Z   },
2026-02-15T03:56:47.6181178Z   "skyPanorama": null,
2026-02-15T03:56:47.6181729Z   "insidePanorama": null,
2026-02-15T03:56:47.6182344Z   "interiorPanorama": null
2026-02-15T03:56:47.6183303Z [Scraper Ex2] 🎯 JSON HIT! Intercepted 20 items.
2026-02-15T03:56:47.6363328Z [Scraper Ex2] 🚀 Fast Kill! Using JSON Data.
2026-02-15T03:56:47.6379181Z [Scraper Ex2] 🚀 Fast Kill! Using JSON Data.
2026-02-15T03:56:47.6387793Z [Scraper Ex2] 📊 Data Usage for Task: 5431.27 KB
2026-02-15T03:56:47.6430591Z [Scraper Ex2] Target "효뜨" rank: 1
2026-02-15T03:56:47.6431344Z [Scraper Ex2] ✅ Task 1/3: ⏱️ 16.71s
2026-02-15T03:56:51.1752026Z [Scraper Ex2] ⏳ Waiting for map scale indicator (Render Check)...
2026-02-15T03:56:51.1810617Z [Scraper Ex2] 🗺️ Map fully rendered (Scale indicator found)
2026-02-15T03:56:51.1812714Z [Scraper Ex2] 📍 Moving to (37.53143293352497, 126.970145)...
2026-02-15T03:56:55.7164685Z [Scraper Ex2] 🖱️ Move Attempt 1/5: Pressing Enter...
2026-02-15T03:56:58.4438760Z [Scraper Ex2] 🚀 Move Verified! (URL changed to /entry/)
2026-02-15T03:56:58.4450224Z [Scraper Ex2] ⏳ Waiting for location context to settle...
2026-02-15T03:57:04.8721525Z [Scraper Ex2] 🔎 Searching: "근처쌀국수" (Attempt 1/5)...
2026-02-15T03:57:06.8831889Z [DEBUG] allSearch 1st item keys: {
2026-02-15T03:57:06.8838075Z   "index": "0",
2026-02-15T03:57:06.8838429Z   "rank": "1",
2026-02-15T03:57:06.8838833Z   "id": "1178829266",
2026-02-15T03:57:06.8839518Z   "name": "쏭타이치앙마이 신용산본점",
2026-02-15T03:57:06.8840125Z   "tel": "0507-1334-5170",
2026-02-15T03:57:06.8840532Z   "isCallLink": false,
2026-02-15T03:57:06.8840944Z   "virtualTel": "0507-1334-5170",
2026-02-15T03:57:06.8841970Z   "virtualTelDisplay": "0507-1334-5170",
2026-02-15T03:57:06.8842458Z   "ppc": "1",
2026-02-15T03:57:06.8842795Z   "category": [
2026-02-15T03:57:06.8843240Z     "음식점",
2026-02-15T03:57:06.8843597Z     "태국음식"
2026-02-15T03:57:06.8843904Z   ],
2026-02-15T03:57:06.8844228Z   "categoryPath": [
2026-02-15T03:57:06.8844573Z     [
2026-02-15T03:57:06.8844876Z       "220036",
2026-02-15T03:57:06.8845199Z       "220043",
2026-02-15T03:57:06.8845524Z       "220124"
2026-02-15T03:57:06.8845844Z     ],
2026-02-15T03:57:06.8846143Z     [
2026-02-15T03:57:06.8846443Z       "1004760",
2026-02-15T03:57:06.8846777Z       "1004380",
2026-02-15T03:57:06.8847094Z       "1002043"
2026-02-15T03:57:06.8847418Z     ]
2026-02-15T03:57:06.8847709Z   ],
2026-02-15T03:57:06.8848016Z   "rcode": "09170125",
2026-02-15T03:57:06.8848398Z   "businessStatus": {
2026-02-15T03:57:06.8848828Z     "requestTime": "202602151257",
2026-02-15T03:57:06.8849250Z     "status": {
2026-02-15T03:57:06.8849593Z       "code": 2,
2026-02-15T03:57:06.8880946Z       "text": "영업 중",
2026-02-15T03:57:06.8881360Z       "emphasis": false,
2026-02-15T03:57:06.8881850Z       "description": "영업중",
2026-02-15T03:57:06.8882405Z       "detailInfo": "15:00에 브레이크타임"
2026-02-15T03:57:06.8882832Z     },
2026-02-15T03:57:06.8883218Z     "businessHours": "202602151100~202602152140",
2026-02-15T03:57:06.8883759Z     "breakTime": "202602151500~202602151700",
2026-02-15T03:57:06.8884206Z     "lastOrder": ""
2026-02-15T03:57:06.8884525Z   },
2026-02-15T03:57:06.8884826Z   "naviInfoText": null,
2026-02-15T03:57:06.8885197Z   "naviInfo": null,
2026-02-15T03:57:06.8910895Z   "address": "서울특별시 용산구 한강로2가 73-4 1층 쏭타이치앙마이",
2026-02-15T03:57:06.8911741Z   "roadAddress": "서울특별시 용산구 한강대로40길 39-5 1층 쏭타이치앙마이",
2026-02-15T03:57:06.8912459Z   "abbrAddress": "한강로2가 73-4 1층 쏭타이치앙마이",
2026-02-15T03:57:06.8912916Z   "shortAddress": [
2026-02-15T03:57:06.8913317Z     "서울 용산구",
2026-02-15T03:57:06.8913695Z     "한강대로40길 39-5",
2026-02-15T03:57:06.8914101Z     "1층 쏭타이치앙마이"
2026-02-15T03:57:06.8914434Z   ],
2026-02-15T03:57:06.8915146Z   "display": "쏭타이치앙마이 신용산본점",
2026-02-15T03:57:06.8915611Z   "telDisplay": "0507-1334-5170",
2026-02-15T03:57:06.8916021Z   "context": [],
2026-02-15T03:57:06.8916360Z   "reviewCount": 2070,
2026-02-15T03:57:06.8916738Z   "placeReviewCount": 3062,
2026-02-15T03:57:06.8920893Z   "ktCallMd": "c1dcfe9dd6b9901040db37c0054ddf92",
2026-02-15T03:57:06.8921454Z   "coupon": "0",
2026-02-15T03:57:06.8922365Z   "thumUrl": "https://ldb-phinf.pstatic.net/20251031_266/17619213391192P3sc_JPEG/%C0%FC%C3%BC_%BA%B9%BB%E7.jpg",
2026-02-15T03:57:06.8923163Z   "thumUrls": [
2026-02-15T03:57:06.8923900Z     "https://ldb-phinf.pstatic.net/20251031_266/17619213391192P3sc_JPEG/%C0%FC%C3%BC_%BA%B9%BB%E7.jpg",
2026-02-15T03:57:06.8925104Z     "https://ldb-phinf.pstatic.net/20251031_206/1761921364025eTXWN_JPEG/%BA%CE%B0%A21_%BA%B9%BB%E7.jpg",
2026-02-15T03:57:06.8926348Z     "https://ldb-phinf.pstatic.net/20251031_100/1761921364025aAsHY_JPEG/%BA%CE%B0%A24_%BA%B9%BB%E7.jpg"
2026-02-15T03:57:06.8927375Z   ],
2026-02-15T03:57:06.8927683Z   "type": "s",
2026-02-15T03:57:06.8928011Z   "isSite": "1",
2026-02-15T03:57:06.8928353Z   "posExact": "1",
2026-02-15T03:57:06.8928690Z   "x": "126.9716020",
2026-02-15T03:57:06.8929031Z   "y": "37.5303650",
2026-02-15T03:57:06.8929371Z   "itemLevel": "12",
2026-02-15T03:57:06.8960983Z   "isAdultBusiness": false,
2026-02-15T03:57:06.8961472Z   "streetPanorama": {
2026-02-15T03:57:06.8964286Z     "id": "nic6olEdEd7yjuKRfAwQAw==",
2026-02-15T03:57:06.8964785Z     "pan": "-47.39",
2026-02-15T03:57:06.8965119Z     "tilt": "10.00",
2026-02-15T03:57:06.8965455Z     "lng": "126.9716550",
2026-02-15T03:57:06.8965818Z     "lat": "37.5303163",
2026-02-15T03:57:06.8966179Z     "fov": "120"
2026-02-15T03:57:06.8966488Z   },
2026-02-15T03:57:06.8966772Z   "skyPan
2026-02-15T03:57:06.8967412Z [Scraper Ex2] 🎯 JSON HIT! Intercepted 20 items.
2026-02-15T03:57:06.9798982Z [Scraper Ex2] 🚀 Fast Kill! Using JSON Data.
2026-02-15T03:57:06.9800275Z [Scraper Ex2] 🚀 Fast Kill! Using JSON Data.
2026-02-15T03:57:06.9801202Z [Scraper Ex2] 📊 Data Usage for Task: 5453.76 KB
2026-02-15T03:57:06.9802027Z [Scraper Ex2] Target "효뜨" rank: 2
2026-02-15T03:57:06.9802767Z [Scraper Ex2] ✅ Task 2/3: ⏱️ 17.81s
2026-02-15T03:57:10.7141535Z [Scraper Ex2] ⏳ Waiting for map scale indicator (Render Check)...
2026-02-15T03:57:10.7217331Z [Scraper Ex2] 🗺️ Map fully rendered (Scale indicator found)
2026-02-15T03:57:10.7218767Z [Scraper Ex2] 📍 Moving to (37.534127867049946, 126.970145)...
2026-02-15T03:57:15.3544473Z [Scraper Ex2] 🖱️ Move Attempt 1/5: Pressing Enter...
2026-02-15T03:57:17.7011513Z [Scraper Ex2] 🚀 Move Verified! (URL changed to /entry/)
2026-02-15T03:57:17.7014468Z [Scraper Ex2] ⏳ Waiting for location context to settle...
2026-02-15T03:57:24.1741686Z [Scraper Ex2] 🔎 Searching: "근처쌀국수" (Attempt 1/5)...
2026-02-15T03:57:26.2170208Z [DEBUG] allSearch 1st item keys: {
2026-02-15T03:57:26.2172039Z   "index": "0",
2026-02-15T03:57:26.2172396Z   "rank": "1",
2026-02-15T03:57:26.2172740Z   "id": "1667485620",
2026-02-15T03:57:26.2173386Z   "name": "콘타이 용산아이파크몰점",
2026-02-15T03:57:26.2173788Z   "tel": "02-2012-1610",
2026-02-15T03:57:26.2174167Z   "isCallLink": false,
2026-02-15T03:57:26.2174526Z   "virtualTel": "",
2026-02-15T03:57:26.2174895Z   "virtualTelDisplay": "",
2026-02-15T03:57:26.2175300Z   "ppc": "1",
2026-02-15T03:57:26.2175637Z   "category": [
2026-02-15T03:57:26.2176031Z     "음식점",
2026-02-15T03:57:26.2176388Z     "태국음식"
2026-02-15T03:57:26.2176693Z   ],
2026-02-15T03:57:26.2177002Z   "categoryPath": [
2026-02-15T03:57:26.2177344Z     [
2026-02-15T03:57:26.2177637Z       "220036",
2026-02-15T03:57:26.2177963Z       "220043",
2026-02-15T03:57:26.2178280Z       "220124"
2026-02-15T03:57:26.2178587Z     ]
2026-02-15T03:57:26.2178864Z   ],
2026-02-15T03:57:26.2179154Z   "rcode": "09170128",
2026-02-15T03:57:26.2179514Z   "businessStatus": {
2026-02-15T03:57:26.2180148Z     "requestTime": "202602151257",
2026-02-15T03:57:26.2180550Z     "status": {
2026-02-15T03:57:26.2180885Z       "code": 2,
2026-02-15T03:57:26.2185488Z       "text": "영업 중",
2026-02-15T03:57:26.2185965Z       "emphasis": false,
2026-02-15T03:57:26.2186498Z       "description": "영업중",
2026-02-15T03:57:26.2187072Z       "detailInfo": "20:30에 라스트오더"
2026-02-15T03:57:26.2187501Z     },
2026-02-15T03:57:26.2187912Z     "businessHours": "202602151100~202602152200",
2026-02-15T03:57:26.2188395Z     "breakTime": "",
2026-02-15T03:57:26.2188778Z     "lastOrder": "202602152030"
2026-02-15T03:57:26.2189153Z   },
2026-02-15T03:57:26.2189448Z   "naviInfoText": null,
2026-02-15T03:57:26.2190164Z   "naviInfo": null,
2026-02-15T03:57:26.2190785Z   "address": "서울특별시 용산구 한강로3가 40-999 용산현대아이파크몰 리빙파크 7층",
2026-02-15T03:57:26.2191585Z   "roadAddress": "서울특별시 용산구 한강대로23길 55 용산현대아이파크몰 리빙파크 7층",
2026-02-15T03:57:26.2192311Z   "abbrAddress": "한강로3가 40-999 용산현대아이파크몰 리빙파크 7층",
2026-02-15T03:57:26.2192793Z   "shortAddress": [
2026-02-15T03:57:26.2193187Z     "서울 용산구",
2026-02-15T03:57:26.2193554Z     "한강대로23길 55",
2026-02-15T03:57:26.2194234Z     "용산현대아이파크몰 리빙파크 7층"
2026-02-15T03:57:26.2194580Z   ],
2026-02-15T03:57:26.2194917Z   "display": "콘타이 용산아이파크몰점",
2026-02-15T03:57:26.2195347Z   "telDisplay": "02-2012-1610",
2026-02-15T03:57:26.2195745Z   "context": [],
2026-02-15T03:57:26.2196078Z   "reviewCount": 538,
2026-02-15T03:57:26.2196449Z   "placeReviewCount": 7565,
2026-02-15T03:57:26.2196961Z   "ktCallMd": "b3ffcd27c6399d4c661a1c6ee806dab7",
2026-02-15T03:57:26.2197449Z   "coupon": "0",
2026-02-15T03:57:26.2198391Z   "thumUrl": "https://ldb-phinf.pstatic.net/20220130_190/1643520100999dyJU8_JPEG/547C4A58-6BC4-43F0-8C07-6E8F33811D9E.jpeg",
2026-02-15T03:57:26.2199325Z   "thumUrls": [
2026-02-15T03:57:26.2200398Z     "https://ldb-phinf.pstatic.net/20220130_190/1643520100999dyJU8_JPEG/547C4A58-6BC4-43F0-8C07-6E8F33811D9E.jpeg",
2026-02-15T03:57:26.2201741Z     "https://ldb-phinf.pstatic.net/20250905_295/1757043639093ep608_PNG/2025_06_01_%B8%DE%B4%BA%C6%C7.png",
2026-02-15T03:57:26.2202990Z     "https://ldb-phinf.pstatic.net/20200215_43/1581759370908280zo_JPEG/rrbvzSWDEFyMaajh19ODlh2g.jpg"
2026-02-15T03:57:26.2203801Z   ],
2026-02-15T03:57:26.2204091Z   "type": "s",
2026-02-15T03:57:26.2204407Z   "isSite": "1",
2026-02-15T03:57:26.2204732Z   "posExact": "1",
2026-02-15T03:57:26.2205070Z   "x": "126.9647415",
2026-02-15T03:57:26.2205434Z   "y": "37.5297718",
2026-02-15T03:57:26.2205802Z   "itemLevel": "12",
2026-02-15T03:57:26.2206186Z   "isAdultBusiness": false,
2026-02-15T03:57:26.2206599Z   "streetPanorama": null,
2026-02-15T03:57:26.2207000Z   "skyPanorama": {
2026-02-15T03:57:26.2207421Z     "id": "EQwZGxiMfQZdjpECKWoEJg==",
2026-02-15T03:57:26.2207890Z     "pan": "66.69",
2026-02-15T03:57:26.2208257Z     "tilt": "-30.00",
2026-02-15T03:57:26.2208628Z     "lng": "126.9588318",
2026-02-15T03:57:26.2209018Z     "lat": "37.5272217",
2026-02-15T03:57:26.2209395Z     "fov": "124"
2026-02-15T03:57:26.2209893Z   },
2026-02-15T03:57:26.2210225Z   "insidePanorama": null,
2026-02-15T03:57:26.2210639Z   "interiorPanorama":
2026-02-15T03:57:26.2211382Z [Scraper Ex2] 🎯 JSON HIT! Intercepted 20 items.
2026-02-15T03:57:26.2628350Z [Scraper Ex2] 🚀 Fast Kill! Using JSON Data.
2026-02-15T03:57:26.2629398Z [Scraper Ex2] 🚀 Fast Kill! Using JSON Data.
2026-02-15T03:57:26.2630615Z [Scraper Ex2] 📊 Data Usage for Task: 5476.25 KB
2026-02-15T03:57:26.2631445Z [Scraper Ex2] Target "효뜨" rank: 3
2026-02-15T03:57:26.2633205Z [Scraper Ex2] ✅ Task 3/3: ⏱️ 17.61s
2026-02-15T03:57:26.5620033Z [Scraper Ex2] 🏁 Batch Complete! Total Time: 170.6s
2026-02-15T03:57:27.2346025Z [Worker] Saving 3 results to database...
2026-02-15T03:57:28.1726334Z [Worker] Search 11b68a27-1c0c-4a85-a589-42c16c81a97b Completed.
2026-02-15T03:57:28.2183687Z ##[group]Run actions/upload-artifact@v4
2026-02-15T03:57:28.2184006Z with:
2026-02-15T03:57:28.2184204Z   name: debug-videos
2026-02-15T03:57:28.2184423Z   path: videos/
2026-02-15T03:57:28.2184643Z   if-no-files-found: warn
2026-02-15T03:57:28.2184885Z   compression-level: 6
2026-02-15T03:57:28.2185106Z   overwrite: false
2026-02-15T03:57:28.2185341Z   include-hidden-files: false
2026-02-15T03:57:28.2185588Z ##[endgroup]
2026-02-15T03:57:28.4568208Z With the provided path, there will be 1 file uploaded
2026-02-15T03:57:28.4574831Z Artifact name is valid!
2026-02-15T03:57:28.4575712Z Root directory input is valid!
2026-02-15T03:57:28.6278829Z Beginning upload of artifact content to blob storage
2026-02-15T03:57:29.5196080Z Uploaded bytes 8388608
2026-02-15T03:57:29.5973715Z Uploaded bytes 8499185
2026-02-15T03:57:29.6441641Z Finished uploading artifact content to blob storage!
2026-02-15T03:57:29.6446435Z SHA256 digest of uploaded artifact zip is 57ba0ab866983871cdec3e425aa8004cd74246f3efc464ccabc5f7ddb527a522
2026-02-15T03:57:29.6448970Z Finalizing artifact upload
2026-02-15T03:57:29.7543548Z Artifact debug-videos.zip successfully finalized. Artifact ID 5514354762
2026-02-15T03:57:29.7545093Z Artifact debug-videos has been successfully uploaded! Final size is 8499185 bytes. Artifact ID is 5514354762
2026-02-15T03:57:29.7554797Z Artifact download URL: https://github.com/choidev777-bit/maptamin-project/actions/runs/22029244002/artifacts/5514354762
2026-02-15T03:57:29.7729610Z Post job cleanup.
2026-02-15T03:57:29.9554511Z Cache hit occurred on the primary key node-cache-Linux-npm-892baaf18cfb930776fa2ce20ce782412b5a0e2520da1d45b69f668589191c31, not saving cache.
2026-02-15T03:57:29.9683194Z Post job cleanup.
2026-02-15T03:57:30.0451964Z [command]/usr/bin/git version
2026-02-15T03:57:30.0492156Z git version 2.52.0
2026-02-15T03:57:30.0540368Z Temporarily overriding HOME='/home/runner/work/_temp/b7aff1c6-7764-4dc4-aeb1-ad893cbf13d3' before making global git config changes
2026-02-15T03:57:30.0542405Z Adding repository directory to the temporary git global config as a safe directory
2026-02-15T03:57:30.0546399Z [command]/usr/bin/git config --global --add safe.directory /home/runner/work/maptamin-project/maptamin-project
2026-02-15T03:57:30.0584587Z [command]/usr/bin/git config --local --name-only --get-regexp core\.sshCommand
2026-02-15T03:57:30.0620139Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
2026-02-15T03:57:30.0884008Z [command]/usr/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
2026-02-15T03:57:30.0908283Z http.https://github.com/.extraheader
2026-02-15T03:57:30.0921813Z [command]/usr/bin/git config --local --unset-all http.https://github.com/.extraheader
2026-02-15T03:57:30.0955102Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
2026-02-15T03:57:30.1316370Z Cleaning up orphan processes