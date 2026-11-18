/* RHCSA: more labs and four full mock exams. Original tasks, not taken from any book or exam.
   Loads after rhcsa.js. Domain indices: 0 tools, 1 software, 2 scripts, 3 running systems, 4 local storage,
   5 file systems, 6 deploy and maintain, 7 networking, 8 users and groups, 9 security. */
(function(C){if(!C)return;
var L=C.labs;
L.push(
{id:"rh-flatpak",d:1,title:"Repositories, RPMs and Flatpak",brief:"servera has no working repositories. Add http://repo.lab.example.com/AppStream, install the tree package, add the Flathub remote and install the app org.gnome.Calculator from it.",host:"servera",st:{r:0,t:0,f:0,a:0},
 steps:[
  {g:"See which repositories are enabled",re:/^dnf repolist/,hint:"dnf repolist"},
  {g:"Add the AppStream repository",re:/^dnf config-manager (setopt )?--add-repo[= ]?http:\/\/repo\.lab\.example\.com\/AppStream\/?$/,hint:"dnf config-manager --add-repo http://repo.lab.example.com/AppStream"},
  {g:"Install tree",re:/^dnf (-y )?install (-y )?tree/,when:function(s){return s.r;},hint:"dnf install -y tree"},
  {g:"Add the Flathub remote safely",re:/^flatpak remote-add --if-not-exists flathub https:\/\/dl\.flathub\.org\/repo\/flathub\.flatpakrepo$/,hint:"flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo"},
  {g:"Install the calculator app",re:/^flatpak install (-y )?(flathub )?org\.gnome\.Calculator/,when:function(s){return s.f;},hint:"flatpak install -y flathub org.gnome.Calculator"},
  {g:"Prove both are installed",re:/^(flatpak list|rpm -q tree)/,when:function(s){return s.a&&s.t;},hint:"rpm -q tree; flatpak list"}],
 cmds:[
  [/^dnf repolist/,function(s){return s.r?"repo id                              repo name\nrepo.lab.example.com_AppStream       created by dnf config-manager from http://repo.lab.example.com/AppStream":"No repositories available";}],
  [/^dnf config-manager .*--add-repo/,"Adding repo from: http://repo.lab.example.com/AppStream",function(s){s.r=1;}],
  [/^dnf (-y )?install (-y )?tree/,function(s){return s.r?"Installed:\n  tree-2.1.1-6.el10.x86_64\nComplete!":"Error: There are no enabled repositories in \"/etc/yum.repos.d\".";},function(s){if(s.r)s.t=1;}],
  [/^rpm -q tree/,function(s){return s.t?"tree-2.1.1-6.el10.x86_64":"package tree is not installed";}],
  [/^flatpak remote-add/,"",function(s){s.f=1;}],
  [/^flatpak remotes/,function(s){return s.f?"Name    Options\nflathub system":"";}],
  [/^flatpak install/,function(s){return s.f?"Installing app/org.gnome.Calculator/x86_64/stable\nInstallation complete.":"error: No remote refs found for 'org.gnome.Calculator'";},function(s){if(s.f)s.a=1;}],
  [/^flatpak list/,function(s){return s.a?"Name        Application ID          Version  Branch  Installation\nCalculator  org.gnome.Calculator    48.1     stable  system":"";}]],
 win:"dnf config-manager --add-repo writes a .repo file for you. Writing it by hand in /etc/yum.repos.d works just as well. Flatpak apps are installed from remotes, separate from DNF."},
{id:"rh-perms",d:5,title:"A shared folder that works",brief:"Members of group finance must all create and edit files in /srv/finance, new files must belong to finance, other users get nothing, and user auditor must be able to read the folder without joining the group.",host:"servera",st:{g:0,m:0,a:0},
 steps:[
  {g:"Look at the current ownership and mode",re:/^ls -l?d \/srv\/finance|^ls -ld \/srv\/finance/,hint:"ls -ld /srv/finance"},
  {g:"Give the folder to group finance",re:/^(chgrp finance \/srv\/finance|chown (root)?:finance \/srv\/finance)$/,hint:"chgrp finance /srv/finance"},
  {g:"Set rwx for owner and group, setgid, nothing for others",re:/^chmod 2770 \/srv\/finance$/,hint:"chmod 2770 /srv/finance"},
  {g:"Let auditor read the folder with an ACL",re:/^setfacl -m u:auditor:r-?x \/srv\/finance$/,hint:"setfacl -m u:auditor:rx /srv/finance"},
  {g:"Check the ACL",re:/^getfacl \/srv\/finance/,when:function(s){return s.a;},hint:"getfacl /srv/finance"}],
 cmds:[
  [/^ls -l?d \/srv\/finance/,function(s){return (s.m?"drwxrws---":"drwxr-xr-x")+(s.a?"+":".")+" 2 root "+(s.g?"finance":"root   ")+" 6 Nov 17 10:02 /srv/finance";}],
  [/^(chgrp finance|chown (root)?:finance) \/srv\/finance/,"",function(s){s.g=1;}],
  [/^chmod 2770 \/srv\/finance/,"",function(s){s.m=1;}],
  [/^chmod 1777 \/srv\/finance/,"(That makes it world-writable with the sticky bit. The task says others get nothing and new files inherit the group: 2770.)"],
  [/^chmod 0?770 \/srv\/finance/,"(Close, but without the setgid bit new files would get each user's own group. Use 2770.)"],
  [/^setfacl -m u:auditor:/,"",function(s){s.a=1;}],
  [/^getfacl \/srv\/finance/,function(s){return "# file: srv/finance\n# owner: root\n# group: "+(s.g?"finance":"root")+"\n# flags: "+(s.m?"-s-":"---")+"\nuser::rwx\n"+(s.a?"user:auditor:r-x\n":"")+"group::"+(s.m?"rwx":"r-x")+"\nmask::"+(s.m||s.a?"rwx":"r-x")+"\nother::"+(s.m?"---":"r-x");}],
  [/^id auditor/,"uid=2010(auditor) gid=2010(auditor) groups=2010(auditor)"]],
 win:"2770: 2 is setgid, so new files inherit the folder's group. An ACL gives one extra user access without adding them to the group."},
{id:"rh-nfs",d:5,title:"Mount an NFS export at boot",brief:"Mount server1:/exports/projects on /mnt/projects now and at every boot.",host:"servera",st:{d:0,t:0,m:0},
 steps:[
  {g:"List the server's exports",re:/^showmount -e server1/,hint:"showmount -e server1"},
  {g:"Create the mount point",re:/^mkdir (-p )?\/mnt\/projects/,hint:"mkdir -p /mnt/projects"},
  {g:"Add a network mount to /etc/fstab",re:/^echo ['"]?server1:\/exports\/projects \/mnt\/projects nfs4? \S*_netdev\S*( 0 0)?['"]? ?>> ?\/etc\/fstab/,hint:"echo 'server1:/exports/projects /mnt/projects nfs defaults,_netdev 0 0' >> /etc/fstab"},
  {g:"Mount it from fstab and check",re:/^(df -h|findmnt|mount \| ?grep) .*\/mnt\/projects|^df -h \/mnt\/projects/,when:function(s){return s.m;},hint:"mount -a; df -h /mnt/projects"}],
 cmds:[
  [/^showmount -e server1/,"Export list for server1:\n/exports/projects 172.25.250.0/24"],
  [/^mkdir (-p )?\/mnt\/projects/,"",function(s){s.d=1;}],
  [/^echo .*>> ?\/etc\/fstab/,"",function(s){s.t=1;}],
  [/^mount -a/,function(s){return s.t&&!s.d?"mount: /mnt/projects: mount point does not exist.":"";},function(s){if(s.t&&s.d)s.m=1;}],
  [/^mount (-t nfs4? )?server1:\/exports\/projects \/mnt\/projects/,"(That mounts it now, but not at boot. The task needs an fstab line.)"],
  [/^(df -h|findmnt|mount \| ?grep)( .*)?\/mnt\/projects|^df -h \/mnt\/projects/,function(s){return s.m?"server1:/exports/projects   20G  4.2G   16G  21% /mnt/projects":"";}]],
 win:"_netdev tells systemd to wait for the network before mounting. Test with mount -a; a wrong NFS line can delay boot."},
{id:"rh-timer",d:6,title:"Run jobs on a schedule with systemd and at",brief:"Unit files /etc/systemd/system/cleanup.service and cleanup.timer already exist but the timer never runs. Activate the timer so it survives reboots, and schedule a one-time reboot notice for 30 minutes from now with at.",host:"servera",st:{r:0,e:0,at:0,a:0},
 steps:[
  {g:"Read the timer unit",re:/^(cat|systemctl cat) .*cleanup\.timer/,hint:"systemctl cat cleanup.timer"},
  {g:"Reload systemd so it sees the units",re:/^systemctl daemon-reload/,hint:"systemctl daemon-reload"},
  {g:"Enable and start the timer, not the service",re:/^systemctl enable --now cleanup\.timer/,hint:"systemctl enable --now cleanup.timer"},
  {g:"Confirm the next run",re:/^systemctl list-timers/,when:function(s){return s.e;},hint:"systemctl list-timers cleanup.timer"},
  {g:"Make sure atd runs",re:/^systemctl (enable --now|start) atd/,hint:"systemctl enable --now atd"},
  {g:"Schedule the notice with at",re:/^echo .*\| ?at now ?\+ ?30 ?min(ute)?s?/,when:function(s){return s.a;},hint:"echo 'wall Reboot at noon' | at now + 30 minutes"}],
 cmds:[
  [/^(cat|systemctl cat) .*cleanup\.timer/,"[Unit]\nDescription=Nightly cleanup\n\n[Timer]\nOnCalendar=*-*-* 03:00:00\nPersistent=true\n\n[Install]\nWantedBy=timers.target"],
  [/^systemctl daemon-reload/,"",function(s){s.r=1;}],
  [/^systemctl enable --now cleanup\.timer/,"Created symlink '/etc/systemd/system/timers.target.wants/cleanup.timer' → '/etc/systemd/system/cleanup.timer'.",function(s){s.e=1;}],
  [/^systemctl enable --now cleanup\.service/,"(Enabling the service runs it at boot, not on the schedule. The timer is what you enable.)"],
  [/^systemctl list-timers/,function(s){return s.e?"NEXT                        LEFT      LAST PASSED UNIT          ACTIVATES\nWed 2026-11-18 03:00:00 UTC 16h left  -    -      cleanup.timer cleanup.service":"0 timers listed.";}],
  [/^systemctl (enable --now|start) atd/,"",function(s){s.a=1;}],
  [/^echo .*\| ?at now/,function(s){return s.a?"warning: commands will be executed using /bin/sh\njob 4 at Tue Nov 17 11:32:00 2026":"Can't open /var/run/atd.pid to signal atd. No atd running?";},function(s){if(s.a)s.at=1;}],
  [/^atq/,function(s){return s.at?"4\tTue Nov 17 11:32:00 2026 a root":"";}]],
 win:"Enable the .timer, never the .service, for scheduled units. Persistent=true runs a missed job after the machine was off."},
{id:"rh-ssh",d:9,title:"Key-based SSH and no root logins",brief:"As root on servera, set up key-based login to natasha@serverb, then forbid direct root logins over SSH on servera.",host:"servera",st:{k:0,c:0,p:0,r:0},
 steps:[
  {g:"Generate a key pair",re:/^ssh-keygen/,hint:"ssh-keygen -t ed25519 -N '' -f ~/.ssh/id_ed25519"},
  {g:"Copy the public key to natasha@serverb",re:/^ssh-copy-id .*natasha@serverb/,when:function(s){return s.k;},hint:"ssh-copy-id natasha@serverb"},
  {g:"Prove login works without a password",re:/^ssh natasha@serverb/,when:function(s){return s.c;},hint:"ssh natasha@serverb hostname"},
  {g:"Set PermitRootLogin no",re:/^(sed .*PermitRootLogin.*no.*sshd_config|echo ['"]?PermitRootLogin no['"]? ?>> ?\/etc\/ssh\/sshd_config|echo ['"]?PermitRootLogin no['"]? ?> ?\/etc\/ssh\/sshd_config\.d\/\S+\.conf)/,hint:"echo 'PermitRootLogin no' > /etc/ssh/sshd_config.d/50-noroot.conf, or sed the main file"},
  {g:"Restart sshd",re:/^systemctl (restart|reload) sshd/,when:function(s){return s.p;},hint:"systemctl restart sshd"}],
 cmds:[
  [/^ssh-keygen/,"Generating public/private ed25519 key pair.\nYour identification has been saved in /root/.ssh/id_ed25519\nYour public key has been saved in /root/.ssh/id_ed25519.pub",function(s){s.k=1;}],
  [/^ssh-copy-id .*natasha@serverb/,function(s){return s.k?"Number of key(s) added: 1\n\nNow try logging into the machine, with: \"ssh 'natasha@serverb'\"":"/usr/bin/ssh-copy-id: ERROR: No identities found";},function(s){if(s.k)s.c=1;}],
  [/^ssh natasha@serverb/,function(s){return s.c?"serverb.lab.example.com":"natasha@serverb's password: ";}],
  [/^(sed .*PermitRootLogin|echo ['"]?PermitRootLogin no)/,"",function(s){s.p=1;}],
  [/^echo ['"]?PermitRootLogin no['"]? ?> ?\/etc\/ssh\/sshd_config\.d\/\S+\.conf/,"",function(s){s.p=1;}],
  [/^grep .*PermitRootLogin/,function(s){return s.p?"PermitRootLogin no":"#PermitRootLogin prohibit-password";}],
  [/^sshd -t/,""],
  [/^systemctl (restart|reload) sshd/,"",function(s){if(s.p)s.r=1;}]],
 win:"ssh-copy-id puts the key in ~/.ssh/authorized_keys with the right permissions. Always run sshd -t before restarting so a typo can't lock you out."},
{id:"rh-proc",d:3,title:"Tame a runaway process",brief:"servera is slow. Find the process using the most CPU, lower its priority, then stop the leftover process named stress-ng-mem.",host:"servera",st:{n:0,k:0},
 steps:[
  {g:"Find the top CPU consumer",re:/^(top|ps .*--sort=-?%?cpu|ps aux .*sort)/,hint:"ps aux --sort=-%cpu | head -5"},
  {g:"Lower its priority to nice 15",re:/^renice (-n )?\+?15 (-p )?5150$/,hint:"renice -n 15 -p 5150"},
  {g:"Check its new nice value",re:/^ps .*-o .*ni.*5150|^ps .*5150.*-o .*ni|^ps -l?p 5150|^top -p 5150/,when:function(s){return s.n;},hint:"ps -o pid,ni,comm -p 5150"},
  {g:"Stop stress-ng-mem politely",re:/^(pkill|killall) (-15 |-TERM )?stress-ng-mem$|^kill (-15 |-TERM )?6262$/,hint:"pkill stress-ng-mem"},
  {g:"Confirm it is gone",re:/^(pgrep|ps .*grep) .*stress-ng-mem|^pgrep stress-ng-mem/,when:function(s){return s.k;},hint:"pgrep stress-ng-mem"}],
 cmds:[
  [/^(top|ps .*--sort|ps aux .*sort)/,function(s){return "USER     PID %CPU %MEM COMMAND\nbatch   5150 97.8  1.2 /usr/local/bin/crunch --all\nroot    "+(s.k?"":"6262 12.0 38.5 stress-ng-mem\nroot    ")+"1088  0.4  0.9 /usr/lib/systemd/systemd-journald";}],
  [/^renice /,"5150 (process ID) old priority 0, new priority 15",function(s){s.n=1;}],
  [/^ps .*5150|^top -p 5150/,function(s){return "    PID  NI COMMAND\n   5150  "+(s.n?"15":" 0")+" crunch";}],
  [/^(pkill|killall|kill) .*(stress-ng-mem|6262)/,"",function(s){s.k=1;}],
  [/^kill -9/,"(SIGKILL works, but try a normal TERM first so the process can clean up.)",function(s){s.k=1;}],
  [/^(pgrep|ps .*grep) .*stress-ng-mem|^pgrep stress-ng-mem/,function(s){return s.k?"":"6262";}]],
 win:"A higher nice value means a lower priority. Send TERM first and keep kill -9 for processes that ignore it."},
{id:"rh-find",d:0,title:"Find, filter and archive",brief:"Copy every file owned by user harry into /root/harry-files, save the lines of /usr/share/dict/words containing 'ich' to /root/lines.txt, and archive /var/log as /root/logs.tar.gz.",host:"servera",st:{d:0,c:0,g:0,t:0},
 steps:[
  {g:"Create the target directory",re:/^mkdir (-p )?\/root\/harry-files/,hint:"mkdir /root/harry-files"},
  {g:"Copy harry's files with find",re:/^find \/ .*-user harry.* -exec cp (-\w+ )?\{\} \/root\/harry-files\/? ?\\;$/,when:function(s){return s.d;},hint:"find / -user harry -type f -exec cp -a {} /root/harry-files/ \\;"},
  {g:"Save the matching lines",re:/^grep ['"]?ich['"]? \/usr\/share\/dict\/words ?> ?\/root\/lines\.txt$/,hint:"grep ich /usr/share/dict/words > /root/lines.txt"},
  {g:"Create the gzip archive",re:/^tar -?[cvzf]*c[cvzf]*z[cvzf]*f? \/root\/logs\.tar\.gz \/var\/log\/?$|^tar -?[cvzf]*z[cvzf]*c[cvzf]*f? \/root\/logs\.tar\.gz \/var\/log\/?$/,hint:"tar -czf /root/logs.tar.gz /var/log"},
  {g:"List the archive to check it",re:/^tar -?t[vzf]*f? \/root\/logs\.tar\.gz|^tar -?[zv]*t[zvf]* \/root\/logs\.tar\.gz/,when:function(s){return s.t;},hint:"tar -tzf /root/logs.tar.gz | head"}],
 cmds:[
  [/^mkdir (-p )?\/root\/harry-files/,"",function(s){s.d=1;}],
  [/^find \/ .*-user harry.*-exec/,function(s){return s.d?"find: '/proc/2210/task/2210/fd/5': No such file or directory":"cp: target '/root/harry-files/': No such file or directory";},function(s){if(s.d)s.c=1;}],
  [/^find \/ .*-user harry/,"/home/harry\n/home/harry/.bashrc\n/home/harry/report.txt\n/var/tmp/harry-notes\n/srv/shared/harry.csv"],
  [/^ls (-\w+ )?\/root\/harry-files/,function(s){return s.c?".bashrc  harry-notes  harry.csv  report.txt":"";}],
  [/^grep .*\/usr\/share\/dict\/words ?> ?\/root\/lines\.txt/,"",function(s){s.g=1;}],
  [/^(wc -l|head) .*\/root\/lines\.txt/,function(s){return s.g?"1442 /root/lines.txt":"";}],
  [/^tar -?[cvzf]*c/,"tar: Removing leading `/' from member names",function(s){s.t=1;}],
  [/^tar -?[tvzf]*t|^tar -?[zv]*t/,function(s){return s.t?"var/log/\nvar/log/messages\nvar/log/secure\nvar/log/dnf.log":"tar: /root/logs.tar.gz: Cannot open: No such file or directory";}]],
 win:"find -exec ends with \\; and {} stands for each file. tar: c create, z gzip, f file, t list."});

/* ---------- Mock exams: generated from parameter sets so each one uses different names, sizes and values ---------- */
function rx(s){return String(s).replace(/[.*+?^${}()|[\]\\\/]/g,"\\$&");}
var KNOWN="id getent ls ll cat less head tail grep cd pwd mkdir rmdir touch cp mv rm ln chmod chown chgrp setfacl getfacl find tar gzip bzip2 vim vi nano echo printf sed awk sort uniq wc lsblk blkid df du free mount umount findmnt swapon swapoff mkswap parted gdisk fdisk pvcreate pvs vgs lvs pvdisplay vgdisplay lvdisplay vgcreate lvcreate lvextend lvremove mkfs mkfs.xfs mkfs.ext4 mkfs.vfat xfs_growfs resize2fs systemctl journalctl nmcli ip ping hostnamectl hostname dnf rpm flatpak useradd usermod userdel groupadd groupmod passwd chage su sudo visudo crontab at atq firewall-cmd getenforce setenforce sestatus semanage restorecon chcon getsebool setsebool ausearch sealert tuned-adm chronyc timedatectl date showmount ssh scp ssh-keygen ssh-copy-id ps top pkill kill renice nice man info whoami uname reboot exit".split(" ");
function makeMock(P){
  var steps=[],cmds=[],init={};
  function T(k,g,re,need,hint,okOut,failOut){steps.push({g:g,re:re,when:need?function(s){return need.every(function(n){return s[n];});}:null,hint:hint});
    cmds.push([re,function(s){return !need||need.every(function(n){return s[n];})?(okOut||""):(failOut||"(Something this depends on is not done yet.)");},function(s){if(!need||need.every(function(n){return s[n];}))s[k]=1;}]);}
  function Q(re,out,eff){cmds.push([re,out||"",eff]);}
  var vg=P.vg,lv=P.lv,dev="/dev/"+vg+"/"+lv,map="/dev/mapper/"+vg+"-"+lv;
  // networking
  T("host","Set the hostname to "+P.host+" permanently.",new RegExp("^hostnamectl (set-)?hostname "+rx(P.host)+"$"),null,"hostnamectl set-hostname "+P.host);
  T("ip","Give connection eth0 the static address "+P.ip+"/24 with gateway "+P.gw+".",new RegExp("^nmcli (con|connection) mod(ify)? eth0 (?=.*ipv4\\.addresses "+rx(P.ip)+"/24)(?=.*ipv4\\.gateway "+rx(P.gw)+")(?=.*ipv4\\.method manual)"),null,"nmcli con mod eth0 ipv4.addresses "+P.ip+"/24 ipv4.gateway "+P.gw+" ipv4.method manual");
  T("dns","Set the DNS server on eth0 to "+P.gw+".",new RegExp("^nmcli (con|connection) mod(ify)? eth0 .*ipv4\\.dns "+rx(P.gw)),null,"nmcli con mod eth0 ipv4.dns "+P.gw);
  T("up","Activate the new network settings.",/^nmcli (con|connection) up eth0$/,["ip"],"nmcli con up eth0","Connection successfully activated.");
  // software
  T("repo","Configure the repository "+P.repo+" on this system.",new RegExp("^dnf config-manager (setopt )?--add-repo[= ]?"+rx(P.repo)+"/?$"),null,"dnf config-manager --add-repo "+P.repo,"Adding repo from: "+P.repo);
  T("fp","Add the Flatpak remote "+P.fpName+" from "+P.fpUrl+" without failing if it already exists.",new RegExp("^flatpak remote-add --if-not-exists "+rx(P.fpName)+" "+rx(P.fpUrl)+"$"),null,"flatpak remote-add --if-not-exists "+P.fpName+" "+P.fpUrl);
  // users
  T("grp","Create group "+P.grp+" with GID "+P.gid+".",new RegExp("^groupadd (?=.*-g ?"+P.gid+"\\b).*\\b"+rx(P.grp)+"\\b"),null,"groupadd -g "+P.gid+" "+P.grp);
  T("u1","Create user "+P.u1+" with UID "+P.uid+" and secondary group "+P.grp+".",new RegExp("^useradd (?=.*-u ?"+P.uid+"\\b)(?=.*-G ?"+rx(P.grp)+"\\b).*\\b"+rx(P.u1)+"$"),["grp"],"useradd -u "+P.uid+" -G "+P.grp+" "+P.u1,"","useradd: group '"+P.grp+"' does not exist");
  T("u2","Create user "+P.u2+" who cannot log in interactively.",new RegExp("^useradd (?=.*-s ?/sbin/nologin).*\\b"+rx(P.u2)+"$"),null,"useradd -s /sbin/nologin "+P.u2);
  T("age","Make "+P.u1+"'s password expire every "+P.days+" days.",new RegExp("^chage (-M ?"+P.days+"|--maxdays "+P.days+") "+rx(P.u1)+"$"),["u1"],"chage -M "+P.days+" "+P.u1,"","chage: user '"+P.u1+"' does not exist in /etc/passwd");
  T("sudo","Members of "+P.grp+" may run any command with sudo.",new RegExp("^echo ['\"]?%"+rx(P.grp)+" ALL ?= ?\\(ALL(:ALL)?\\) ?(NOPASSWD: ?)?ALL['\"]? ?> ?/etc/sudoers\\.d/\\S+$"),null,"echo '%"+P.grp+" ALL=(ALL) ALL' > /etc/sudoers.d/"+P.grp);
  // shared directory
  Q(new RegExp("^mkdir (-p )?"+rx(P.dir)+"$"),"",function(s){s.sd=1;});
  T("dgrp","Create "+P.dir+" owned by group "+P.grp+".",new RegExp("^(chgrp "+rx(P.grp)+"|chown (root)?:"+rx(P.grp)+") "+rx(P.dir)+"$"),["sd"],"mkdir -p "+P.dir+"; chgrp "+P.grp+" "+P.dir,"","chgrp: cannot access '"+P.dir+"': No such file or directory");
  T("dmode","In "+P.dir+", group members get full access, new files inherit the group, others get nothing.",new RegExp("^chmod 2770 "+rx(P.dir)+"$"),["sd"],"chmod 2770 "+P.dir);
  T("acl","User "+P.u2+" may read "+P.dir+" without joining the group.",new RegExp("^setfacl -m u:"+rx(P.u2)+":r-?x "+rx(P.dir)+"$"),["sd"],"setfacl -m u:"+P.u2+":rx "+P.dir);
  // scheduling and time
  T("cron","As "+P.u1+", run \""+P.cronCmd+"\" "+P.cronWords+".",new RegExp("^(echo ['\"]?"+rx(P.cron+" "+P.cronCmd)+"['\"]? ?\\| ?crontab -u "+rx(P.u1)+" -|crontab (-e -u|-u) "+rx(P.u1)+"( -e)?)$"),["u1"],"echo '"+P.cron+" "+P.cronCmd+"' | crontab -u "+P.u1+" -");
  T("ntp","Synchronise time from "+P.ntp+".",new RegExp("^echo ['\"]?(server|pool) "+rx(P.ntp)+" iburst['\"]? ?>> ?/etc/chrony\\.conf$"),null,"echo 'server "+P.ntp+" iburst' >> /etc/chrony.conf; systemctl restart chronyd");
  Q(/^systemctl (restart|enable --now) chronyd/,"");
  // storage
  T("vg","Create volume group "+vg+" on /dev/vdb1"+(P.pe?" with "+P.pe+" extents":"")+".",new RegExp("^vgcreate "+(P.pe?"(?=.*-s ?"+rx(P.pe)+")":"")+".*\\b"+rx(vg)+"\\b.*/dev/vdb1|^vgcreate "+(P.pe?"-s ?"+rx(P.pe)+" ":"")+rx(vg)+" /dev/vdb1"),null,"vgcreate "+(P.pe?"-s "+P.pe+" ":"")+vg+" /dev/vdb1",'  Volume group "'+vg+'" successfully created');
  Q(/^pvcreate \/dev\/vdb1/,'  Physical volume "/dev/vdb1" successfully created.');
  T("lv","Create logical volume "+lv+" of "+(P.ext?P.ext+" extents":P.size)+" in "+vg+".",new RegExp("^lvcreate (?=.*-n ?"+rx(lv)+"\\b)(?=.*"+(P.ext?"-l ?"+P.ext+"\\b":"-L ?"+rx(P.size))+").*\\b"+rx(vg)+"$"),["vg"],"lvcreate -n "+lv+" "+(P.ext?"-l "+P.ext:"-L "+P.size)+" "+vg,'  Logical volume "'+lv+'" created.','  Volume group "'+vg+'" not found');
  T("fs","Format "+lv+" as "+P.fs+".",new RegExp("^mkfs(\\."+P.fs+"| -t "+P.fs+") ("+rx(dev)+"|"+rx(map)+")$"),["lv"],"mkfs."+P.fs+" "+dev);
  Q(new RegExp("^mkdir (-p )?"+rx(P.mnt)+"$"),"",function(s){s.md=1;});
  Q(/^blkid/,function(s){return s.fs?map+': UUID="'+P.uuid+'" TYPE="'+P.fs+'"':"";});
  T("tab","Mount it on "+P.mnt+" at every boot, by UUID.",new RegExp("^echo ['\"]?UUID=['\"]?"+rx(P.uuid)+"['\"]? "+rx(P.mnt)+" "+P.fs+" defaults( 0 0)?['\"]? ?>> ?/etc/fstab$"),["fs"],"mkdir "+P.mnt+"; blkid "+dev+"; echo 'UUID="+P.uuid+" "+P.mnt+" "+P.fs+" defaults 0 0' >> /etc/fstab");
  T("mnt","Mount everything from /etc/fstab and confirm "+P.mnt+" is mounted.",/^mount -a$/,["tab","md"],"mount -a","","mount: "+P.mnt+": mount point does not exist.");
  T("grow","Grow the existing logical volume /dev/appvg/applv by "+P.grow+", file system included.",new RegExp("^lvextend (?=.*(-r|--resizefs))(?=.*-L ?\\+"+rx(P.grow)+").*/dev/appvg/applv$"),null,"lvextend -r -L +"+P.grow+" /dev/appvg/applv","  Logical volume appvg/applv successfully resized.");
  Q(new RegExp("^lvcreate (?=.*-n ?swaplv).*"+rx(vg)),'  Logical volume "swaplv" created.',function(s){if(s.vg)s.sl=1;});
  Q(new RegExp("^mkswap /dev/("+rx(vg)+"/swaplv|mapper/"+rx(vg)+"-swaplv)$"),"Setting up swapspace version 1",function(s){if(s.sl)s.sm=1;});
  Q(new RegExp("^echo ['\"]?(UUID=\\S+|/dev/("+rx(vg)+"/swaplv|mapper/"+rx(vg)+"-swaplv)) (none|swap) swap defaults( 0 0)?['\"]? ?>> ?/etc/fstab$"),"",function(s){s.st=1;});
  T("swap","Add "+P.swap+" of swap on a new logical volume swaplv in "+vg+", active now and at boot.",/^swapon -a$/,["sl","sm","st"],"lvcreate -n swaplv -L "+P.swap+" "+vg+"; mkswap /dev/"+vg+"/swaplv; echo '/dev/"+vg+"/swaplv none swap defaults 0 0' >> /etc/fstab; swapon -a");
  // autofs
  Q(/^dnf (-y )?install (-y )?autofs/,"Complete!",function(s){s.ai=1;});
  Q(new RegExp("^echo ['\"]?"+rx(P.auto)+" /etc/auto\\.\\w+['\"]? ?> ?/etc/auto\\.master\\.d/\\w+\\.autofs$"),"",function(s){s.am=1;});
  Q(new RegExp("^echo ['\"]?"+rx(P.autoKey)+" -(rw|rw,sync|sync,rw) "+rx(P.nfs)+"['\"]? ?> ?/etc/auto\\.\\w+$"),"",function(s){s.ap=1;});
  T("auto","Automount "+P.nfs+" read-write on "+P.auto+"/"+P.autoKey+" with autofs.",/^systemctl enable --now autofs$/,["ai","am","ap"],"dnf install -y autofs; echo '"+P.auto+" /etc/auto.mock' > /etc/auto.master.d/mock.autofs; echo '"+P.autoKey+" -rw "+P.nfs+"' > /etc/auto.mock; systemctl enable --now autofs","","Failed to enable unit: Unit file autofs.service does not exist, or the maps are missing.");
  // web and security
  T("port","Apache must listen on port "+P.port+": allow it in SELinux.",new RegExp("^semanage port (?=.*-a)(?=.*-t ?http_port_t)(?=.*-p ?tcp).*\\b"+P.port+"$"),null,"semanage port -a -t http_port_t -p tcp "+P.port);
  Q(new RegExp("^semanage fcontext (?=.*-a)(?=.*-t ?httpd_sys_content_t).*"+rx(P.web)),"",function(s){s.fc=1;});
  T("label","Apache serves "+P.web+": make its SELinux label correct and persistent.",new RegExp("^restorecon (-\\w*R\\w* )"+rx(P.web)+"/?$"),["fc"],"semanage fcontext -a -t httpd_sys_content_t \""+P.web+"(/.*)?\"; restorecon -Rv "+P.web,"Relabeled "+P.web,"(No rule for "+P.web+" yet: restorecon would put the old label back.)");
  Q(new RegExp("^firewall-cmd (?=.*--permanent)(?=.*--add-port[= ]?"+P.port+"/tcp)"),"success",function(s){s.fw=1;});
  T("fw","Open port "+P.port+"/tcp in the firewall permanently.",/^firewall-cmd --reload$/,["fw"],"firewall-cmd --permanent --add-port="+P.port+"/tcp; firewall-cmd --reload","success","success\n(Nothing permanent was added.)");
  T("bool","Let Apache "+P.boolWhat+", persistently.",new RegExp("^setsebool -P "+rx(P.bool)+" (on|1|true)$"),null,"setsebool -P "+P.bool+" on");
  // running system
  T("tuned","Apply the tuning profile "+P.tuned+".",new RegExp("^tuned-adm profile "+rx(P.tuned)+"$"),null,"tuned-adm profile "+P.tuned);
  T("target","Boot into text mode by default.",/^systemctl set-default multi-user(\.target)?$/,null,"systemctl set-default multi-user.target");
  T("journal","Keep the system journal across reboots.",/^(mkdir (-p )?\/var\/log\/journal|sed .*Storage=persistent.*journald\.conf|echo ['"]?Storage=persistent['"]? ?>> ?\/etc\/systemd\/journald\.conf)$/,null,"mkdir -p /var/log/journal; systemctl restart systemd-journald");
  Q(/^systemctl restart systemd-journald/,"");
  // essential tools
  Q(new RegExp("^mkdir (-p )?"+rx(P.findDest)+"$"),"",function(s){s.fd=1;});
  T("find","Copy all files owned by "+P.findUser+" to "+P.findDest+".",new RegExp("^find / .*-user "+rx(P.findUser)+".* -exec cp (-\\w+ )?\\{\\} "+rx(P.findDest)+"/? ?\\\\;$"),["fd"],"mkdir "+P.findDest+"; find / -user "+P.findUser+" -type f -exec cp -a {} "+P.findDest+"/ \\;","","cp: target '"+P.findDest+"' is not a directory");
  T("tar","Archive "+P.tarSrc+" as "+P.tarFile+" using "+(P.tarZ==="j"?"bzip2":"gzip")+".",new RegExp("^tar -?[cvf"+P.tarZ+"]*c[cvf"+P.tarZ+"]*"+P.tarZ+"[cvf"+P.tarZ+"]*f? "+rx(P.tarFile)+" "+rx(P.tarSrc)+"/?$|^tar -?[cvf"+P.tarZ+"]*"+P.tarZ+"[cvf"+P.tarZ+"]*c[cvf"+P.tarZ+"]*f? "+rx(P.tarFile)+" "+rx(P.tarSrc)+"/?$"),null,"tar -c"+P.tarZ+"f "+P.tarFile+" "+P.tarSrc);
  // helpers and catch-all
  Q(/^man\b/,"(On the real exam the man pages are there. Look for the EXAMPLES section.)");
  Q(/^getenforce$/,"Enforcing");
  Q(/^(setenforce 0|chcon )/,"(The grader checks enforcing mode and persistent labels. This would not count.)");
  Q(/^(\S+)/,function(s,m){return KNOWN.indexOf(m[1])>=0?"":"bash: "+m[1]+": command not found";});
  return {id:P.id,title:P.title,blurb:P.blurb,exam:true,minutes:150,host:"servera",st:init,
    brief:"Exam conditions: "+steps.length+" tasks, 2 hours 30 minutes, no hints. Everything must survive a reboot. Grade when you are done or when time runs out; you need 70 percent to pass.",steps:steps,cmds:cmds,win:""};
}
var SETS=[
 {id:"rh-mock-a",title:"Mock exam A",blurb:"A full exam: networking, users, storage by size, autofs, SELinux on port 82, and the rest.",host:"servera.lab.example.com",ip:"172.25.250.11",gw:"172.25.250.254",repo:"http://repo.lab.example.com/BaseOS",fpName:"flathub",fpUrl:"https://dl.flathub.org/repo/flathub.flatpakrepo",grp:"sysadmins",gid:3000,u1:"natasha",uid:2001,u2:"sarah",days:90,dir:"/srv/sysadmins",cron:"23 14 * * *",cronWords:"every day at 14:23",cronCmd:"/usr/bin/logger RHCSA",ntp:"classroom.lab.example.com",vg:"datavg",lv:"datalv",size:"500M",fs:"xfs",mnt:"/data",uuid:"7b3f2c1e-9d4a-4f6b-8e2d-1a5c3b7d9f0e",grow:"300M",swap:"512M",auto:"/shares",autoKey:"work",nfs:"server1:/exports/work",port:82,web:"/web",bool:"httpd_enable_homedirs",boolWhat:"serve users' home directories",tuned:"virtual-guest",findUser:"harry",findDest:"/root/harry-files",tarSrc:"/etc",tarFile:"/root/etc.tar.gz",tarZ:"z"},
 {id:"rh-mock-b",title:"Mock exam B",blurb:"Different names and numbers: extents instead of sizes, ext4, a bzip2 archive, port 8888.",host:"serverb.lab.example.com",ip:"172.25.250.12",gw:"172.25.250.254",repo:"http://repo.lab.example.com/AppStream",fpName:"labapps",fpUrl:"https://flatpak.lab.example.com/labapps.flatpakrepo",grp:"devops",gid:4000,u1:"marcus",uid:3101,u2:"guest1",days:60,dir:"/srv/devops",cron:"*/10 * * * *",cronWords:"every 10 minutes",cronCmd:"/usr/bin/date >> /tmp/stamps",ntp:"time.lab.example.com",vg:"appdata",lv:"applogs",ext:60,pe:"16M",fs:"ext4",mnt:"/applogs",uuid:"3e9a7c21-55b0-4d8e-9f1a-6c2b4d8e0a17",grow:"200M",swap:"256M",auto:"/remote",autoKey:"projects",nfs:"server1:/exports/projects",port:8888,web:"/srv/site",bool:"httpd_can_network_connect",boolWhat:"make outbound network connections",tuned:"throughput-performance",findUser:"jacques",findDest:"/root/jacques",tarSrc:"/usr/local",tarFile:"/root/local.tar.bz2",tarZ:"j"},
 {id:"rh-mock-c",title:"Mock exam C",blurb:"Weekday cron schedule, a bigger volume, port 8080 and a different tuning profile.",host:"node1.example.org",ip:"10.10.10.21",gw:"10.10.10.1",repo:"http://content.example.org/rhel10/BaseOS",fpName:"flathub",fpUrl:"https://dl.flathub.org/repo/flathub.flatpakrepo",grp:"finance",gid:5000,u1:"alice",uid:5001,u2:"auditor",days:45,dir:"/srv/finance",cron:"30 9 * * 1-5",cronWords:"at 09:30 Monday to Friday",cronCmd:"/usr/local/bin/report.sh",ntp:"ntp.example.org",vg:"finvg",lv:"finlv",size:"1G",fs:"xfs",mnt:"/finance",uuid:"a1c4e7f2-0b3d-4c6e-8f9a-2b5d7e9f1c3a",grow:"500M",swap:"1G",auto:"/mnt/nfs",autoKey:"reports",nfs:"nfs.example.org:/exports/reports",port:8080,web:"/var/www/finance",bool:"httpd_use_nfs",boolWhat:"serve content from NFS",tuned:"balanced",findUser:"oracle",findDest:"/root/oracle-files",tarSrc:"/var/log",tarFile:"/root/logs.tar.gz",tarZ:"z"},
 {id:"rh-mock-d",title:"Mock exam D",blurb:"The hardest mix: 8 MiB extents, ext4, an every-hour job, port 9090 and bzip2.",host:"rhel10-exam.lab.local",ip:"192.168.122.50",gw:"192.168.122.1",repo:"http://192.168.122.1/repo/AppStream",fpName:"internal",fpUrl:"https://apps.lab.local/internal.flatpakrepo",grp:"ops",gid:6000,u1:"leo",uid:6006,u2:"svc_backup",days:30,dir:"/srv/ops",cron:"0 * * * *",cronWords:"at the start of every hour",cronCmd:"/usr/bin/logger hourly-check",ntp:"pool.lab.local",vg:"opsvg",lv:"opsdata",ext:100,pe:"8M",fs:"ext4",mnt:"/opsdata",uuid:"5d2f8b14-7e6a-4c90-b3d1-8f0e2a4c6b97",grow:"1G",swap:"768M",auto:"/net",autoKey:"tools",nfs:"files.lab.local:/exports/tools",port:9090,web:"/opt/www",bool:"httpd_read_user_content",boolWhat:"read user content",tuned:"powersave",findUser:"daniel",findDest:"/root/daniel",tarSrc:"/home",tarFile:"/root/home.tar.bz2",tarZ:"j"}];
C.mocks=SETS.map(makeMock);
C.mockIntro="<p>Four full practice exams under exam conditions: a 2 hour 30 minute timer, no hints, and no marks until you grade. Each uses different names, sizes, ports and schedules, so you can't pass by memory. Every task has to be done the persistent way to count: <code>--permanent</code>, <code>/etc/fstab</code>, <code>semanage</code>, <code>nmcli con mod</code>, <code>enable --now</code>.</p><p>Type <code>objectives</code> any time to re-read the tasks. Aim for 70 percent to pass; aim for 100 before booking.</p>";
})(window.CERTS&&window.CERTS.rhcsa);
