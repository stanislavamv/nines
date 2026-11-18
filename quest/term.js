/* Terminal missions. The shell is simulated: outputs are scripted to match what the real
   commands print in Lab A, Lab B and standard Linux tooling. The engine strips a leading
   "sudo " and "ip netns exec <ns> " before matching, so both forms work.
   step: {g: goal, re: regex, when?: fn(state), hint}
   cmd:  [regex, output string | fn(state, match), effect fn(state, match)?] */
(function () {
var RULES_HEAD = " pkts bytes target     prot opt in     out     source               destination\n";
var M = [];

/* ---------------- Level 1 ---------------- */
M.push({id:"route", lv:1, title:"The router that would not route",
 brief:"Red (10.10.0.2) cannot ping green (10.20.0.2). Both hang off this VM: red on br0, green on br1. Find out why, fix it, and prove the fix.",
 host:"lab-vm", st:{fwd:0},
 steps:[
  {g:"Reproduce: ping green from red", re:/^ping .*10\.20\.0\.2/, hint:"ip netns exec red ping -c 1 -W 1 10.20.0.2"},
  {g:"Ask the kernel which route red will use", re:/^ip route get 10\.20\.0\.2/, hint:"ip netns exec red ip route get 10.20.0.2"},
  {g:"Check that ARP for the gateway resolved", re:/^ip neigh/, hint:"ip netns exec red ip neigh"},
  {g:"Check whether this host routes at all", re:/^sysctl net\.ipv4\.ip_forward$/, hint:"sysctl net.ipv4.ip_forward"},
  {g:"Turn forwarding on", re:/^sysctl -w net\.ipv4\.ip_forward=1/, hint:"sysctl -w net.ipv4.ip_forward=1"},
  {g:"Ping again and read the TTL", re:/^ping .*10\.20\.0\.2/, when:function(s){return s.fwd==1;}, hint:"Run the same ping. ttl=63 proves one routing hop.", solve:"ip netns exec red ping -c 1 -W 1 10.20.0.2"}
 ],
 cmds:[
  [/^ping .*10\.20\.0\.2/, function(s){return s.fwd? "PING 10.20.0.2 (10.20.0.2) 56(84) bytes of data.\n64 bytes from 10.20.0.2: icmp_seq=1 ttl=63 time=0.071 ms\n\n--- 10.20.0.2 ping statistics ---\n1 packets transmitted, 1 received, 0% packet loss, time 0ms" : "PING 10.20.0.2 (10.20.0.2) 56(84) bytes of data.\n\n--- 10.20.0.2 ping statistics ---\n1 packets transmitted, 0 received, 100% packet loss, time 0ms";}],
  [/^ping .*10\.10\.0\.[13]/, "64 bytes from 10.10.0.1: icmp_seq=1 ttl=64 time=0.038 ms\n1 packets transmitted, 1 received, 0% packet loss"],
  [/^ip route get 10\.20\.0\.2/, "10.20.0.2 via 10.10.0.1 dev veth-red src 10.10.0.2 uid 0\n    cache"],
  [/^ip route$|^ip r$/, "default via 10.10.0.1 dev veth-red\n10.10.0.0/24 dev veth-red proto kernel scope link src 10.10.0.2"],
  [/^ip neigh/, "10.10.0.1 dev veth-red lladdr 3a:1f:9c:22:40:01 REACHABLE\n10.10.0.3 dev veth-red lladdr 7e:02:5b:aa:10:03 STALE"],
  [/^ip (-br )?(addr|a)\b/, "lo               UNKNOWN        127.0.0.1/8\neth0             UP             192.168.50.20/24\nbr0              UP             10.10.0.1/24\nbr1              UP             10.20.0.1/24\nveth-red-br@if5  UP\nveth-blue-br@if7 UP\nveth-green-br@if9 UP"],
  [/^sysctl net\.ipv4\.ip_forward$/, function(s){return "net.ipv4.ip_forward = "+s.fwd;}],
  [/^sysctl -w net\.ipv4\.ip_forward=([01])/, function(s,m){return "net.ipv4.ip_forward = "+m[1];}, function(s,m){s.fwd=+m[1];}],
  [/^tcpdump .*br0/, "listening on br0, link-type EN10MB (Ethernet)\n12:01:07.114 IP 10.10.0.2 > 10.20.0.2: ICMP echo request, id 4, seq 1, length 64"],
  [/^tcpdump .*br1/, function(s){return s.fwd? "listening on br1\n12:01:07.114 IP 10.10.0.2 > 10.20.0.2: ICMP echo request, id 4, seq 1, length 64\n12:01:07.114 IP 10.20.0.2 > 10.10.0.2: ICMP echo reply, id 4, seq 1, length 64":"listening on br1, link-type EN10MB (Ethernet)\n0 packets captured";}]
 ],
 win:"Say it: the VM is the router. With ip_forward at 0, Linux only accepts packets addressed to itself and drops the rest silently. TTL 63 instead of 64 proves the packet crossed one router."});

/* ---------------- Level 2 ---------------- */
M.push({id:"syn", lv:2, title:"Where the SYN died", page:"PAGE: customer reports timeouts from app subnet to 10.20.0.2:9090",
 brief:"Red cannot connect to green on TCP 9090. Port 8080 works. Use the method: reproduce, read the symptom, capture on both sides of the router, then name where the packet died.",
 host:"lab-vm", st:{},
 steps:[
  {g:"Reproduce from the source and read the symptom", re:/^nc .*10\.20\.0\.2 9090/, hint:"ip netns exec red nc -zv -w2 10.20.0.2 9090"},
  {g:"Capture on red's side of the router (br0)", re:/^tcpdump .*br0/, hint:"tcpdump -lni br0 tcp port 9090"},
  {g:"Capture on green's side (br1)", re:/^tcpdump .*br1/, hint:"tcpdump -lni br1 tcp port 9090"},
  {g:"Read the firewall counters", re:/^iptables .*-L( FORWARD)?.*-v|^iptables -v.*-L|^iptables -nvL|^iptables -L -n -v/, hint:"iptables -L FORWARD -v -n --line-numbers"},
  {g:"Name where it died: answer source | path | forward | destination | return", re:/^answer (forward|router|firewall)/, hint:"SYN seen on br0, never on br1. It entered the router and never left."}
 ],
 cmds:[
  [/^nc .*10\.20\.0\.2 9090/, "nc: connect to 10.20.0.2 port 9090 (tcp) timed out: Operation now in progress"],
  [/^nc .*10\.20\.0\.2 8080/, "Connection to 10.20.0.2 8080 port [tcp/*] succeeded!"],
  [/^tcpdump .*br0/, "listening on br0, link-type EN10MB (Ethernet), snapshot length 262144 bytes\n12:14:02.301 IP 10.10.0.2.51844 > 10.20.0.2.9090: Flags [S], seq 2817713301, win 64240, options [mss 1460,sackOK], length 0\n12:14:03.330 IP 10.10.0.2.51844 > 10.20.0.2.9090: Flags [S], seq 2817713301, win 64240, options [mss 1460,sackOK], length 0\n2 packets captured"],
  [/^tcpdump .*br1/, "listening on br1, link-type EN10MB (Ethernet), snapshot length 262144 bytes\n0 packets captured"],
  [/^iptables .*-L|^iptables -nvL/, "Chain FORWARD (policy DROP 2 packets, 120 bytes)\nnum  "+RULES_HEAD+"1      18  1296 ACCEPT     all  --  *      *       0.0.0.0/0            0.0.0.0/0            ctstate RELATED,ESTABLISHED\n2       3   180 ACCEPT     tcp  --  *      *       10.10.0.0/24         10.20.0.0/24         tcp dpt:8080 ctstate NEW\n3       2   168 ACCEPT     icmp --  *      *       10.10.0.0/24         10.20.0.0/24"],
  [/^ss -tlnp/, "State   Recv-Q  Send-Q  Local Address:Port  Peer Address:Port  Process\nLISTEN  0       1       10.20.0.2:8080      0.0.0.0:*          users:((\"nc\",pid=2211,fd=3))\nLISTEN  0       1       10.20.0.2:9090      0.0.0.0:*          users:((\"nc\",pid=2214,fd=3))"],
  [/^ip route get/, "10.20.0.2 via 10.10.0.1 dev veth-red src 10.10.0.2 uid 0"],
  [/^answer (source|path|destination|return)/, "Not quite. The SYN showed on br0, so it left the source. It never showed on br1. Where is it between those two bridges?"],
  [/^answer (forward|router|firewall)/, "Correct. The packet entered the router on br0 and never left on br1, so it died in the FORWARD chain. The policy counter (2 packets) confirms it: no rule allows 9090."]
 ],
 win:"Say it: a timeout means a silent drop. The SYN appeared on br0 and never on br1, and the FORWARD policy counter went up. That's capture-on-both-ends, done for real."});

M.push({id:"pcap", lv:2, title:"Read the capture",
 brief:"Someone saved /tmp/lab.pcap during a failed deploy check. Two connection attempts are in it. Use tshark to find which port was refused.",
 host:"lab-vm", st:{},
 steps:[
  {g:"List every packet", re:/^tshark -r \/tmp\/lab\.pcap$/, hint:"tshark -r /tmp/lab.pcap"},
  {g:"Filter to connection attempts only (SYN without ACK)", re:/^tshark -r \S+ -Y .*syn ?== ?1.*ack ?== ?0/, hint:"tshark -r /tmp/lab.pcap -Y 'tcp.flags.syn==1 && tcp.flags.ack==0'"},
  {g:"Filter to resets only", re:/^tshark -r \S+ -Y .*reset ?== ?1/, hint:"tshark -r /tmp/lab.pcap -Y 'tcp.flags.reset==1'"},
  {g:"Which port was refused? answer <port>", re:/^answer 8889/, hint:"The RST came straight back for one destination port."}
 ],
 cmds:[
  [/^tshark -r \S+ -Y .*syn ?== ?1.*ack ?== ?0/, "    1   0.000000    10.10.0.3 -> 10.10.0.1    TCP 74 56214 -> 8888 [SYN] Seq=0 Win=64240 MSS=1460\n    8   2.104118    10.10.0.3 -> 10.10.0.1    TCP 74 40122 -> 8889 [SYN] Seq=0 Win=64240 MSS=1460"],
  [/^tshark -r \S+ -Y .*reset ?== ?1/, "    9   2.104150    10.10.0.1 -> 10.10.0.3    TCP 54 8889 -> 40122 [RST, ACK] Seq=1 Ack=1 Win=0 Len=0"],
  [/^tshark -r \S+ -q -z conv,tcp/, "TCP Conversations\n                                 |  <-  | |  ->  | | Total |\n10.10.0.3:56214 <-> 10.10.0.1:8888    3  206    4  272    7   478\n10.10.0.3:40122 <-> 10.10.0.1:8889    1   54    1   74    2   128"],
  [/^tshark -r \/tmp\/lab\.pcap$/, "    1   0.000000    10.10.0.3 -> 10.10.0.1    TCP 74 56214 -> 8888 [SYN] Seq=0 Win=64240 MSS=1460\n    2   0.000061    10.10.0.1 -> 10.10.0.3    TCP 74 8888 -> 56214 [SYN, ACK] Seq=0 Ack=1 MSS=1460\n    3   0.000078    10.10.0.3 -> 10.10.0.1    TCP 66 56214 -> 8888 [ACK] Seq=1 Ack=1\n    4   0.000301    10.10.0.3 -> 10.10.0.1    TCP 66 56214 -> 8888 [FIN, ACK] Seq=1 Ack=1\n    5   0.000352    10.10.0.1 -> 10.10.0.3    TCP 66 8888 -> 56214 [ACK] Seq=1 Ack=2\n    6   0.000410    10.10.0.1 -> 10.10.0.3    TCP 66 8888 -> 56214 [FIN, ACK] Seq=1 Ack=2\n    7   0.000422    10.10.0.3 -> 10.10.0.1    TCP 66 56214 -> 8888 [ACK] Seq=2 Ack=2\n    8   2.104118    10.10.0.3 -> 10.10.0.1    TCP 74 40122 -> 8889 [SYN] Seq=0 Win=64240 MSS=1460\n    9   2.104150    10.10.0.1 -> 10.10.0.3    TCP 54 8889 -> 40122 [RST, ACK] Seq=1 Ack=1 Win=0 Len=0"],
  [/^answer 8888/, "8888 completed a full handshake: SYN, SYN-ACK, ACK, then FINs. Look for the reset."],
  [/^answer 8889/, "Correct. SYN, then RST,ACK straight back. That is what refused looks like on the wire: a closed port or a REJECT."]
 ],
 win:"Say it: I capture with tcpdump -w, then filter with tshark. SYNs and resets first to see which connections failed, then retransmissions for loss, then follow one conversation."});

/* ---------------- Level 3 ---------------- */
function fwdRules(s){ var r="Chain FORWARD (policy DROP "+(s.est?0:3)+" packets, "+(s.est?0:180)+" bytes)\nnum  "+RULES_HEAD; var n=1;
 if(s.est) r+=(n++)+"       6   412 ACCEPT     all  --  *      *       0.0.0.0/0            0.0.0.0/0            ctstate RELATED,ESTABLISHED\n";
 r+=(n++)+"       3   180 ACCEPT     tcp  --  *      *       10.10.0.0/24         10.20.0.0/24         tcp dpt:8080 ctstate NEW\n";
 r+=(n++)+"       0     0 ACCEPT     icmp --  *      *       10.10.0.0/24         10.20.0.0/24"; return r; }
M.push({id:"stateful", lv:3, title:"One rule from stateless", page:"PAGE: allowed port 8080 timing out after a firewall cleanup",
 brief:"Someone tidied the FORWARD chain. Now red times out on green:8080, a port that has an ACCEPT rule. Find what is missing and put it back.",
 host:"lab-vm", st:{est:false},
 steps:[
  {g:"Reproduce on the allowed port", re:/^nc .*10\.20\.0\.2 8080/, hint:"ip netns exec red nc -zv -w2 10.20.0.2 8080"},
  {g:"List the FORWARD rules with counters", re:/^iptables .*-L|^iptables -nvL/, hint:"iptables -L FORWARD -v -n --line-numbers"},
  {g:"Capture on green's side: does a SYN-ACK come back?", re:/^tcpdump .*br1/, hint:"tcpdump -lni br1 tcp port 8080"},
  {g:"Restore the rule that lets replies through", re:/^iptables -[IA] FORWARD.*(ESTABLISHED,RELATED|RELATED,ESTABLISHED).*-j ACCEPT/, hint:"iptables -I FORWARD 1 -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT"},
  {g:"Retest", re:/^nc .*10\.20\.0\.2 8080/, when:function(s){return s.est;}, hint:"Same nc command as step 1.", solve:"ip netns exec red nc -zv -w2 10.20.0.2 8080"}
 ],
 cmds:[
  [/^nc .*10\.20\.0\.2 8080/, function(s){return s.est?"Connection to 10.20.0.2 8080 port [tcp/*] succeeded!":"nc: connect to 10.20.0.2 port 8080 (tcp) timed out: Operation now in progress";}],
  [/^iptables -[IA] FORWARD.*(ESTABLISHED,RELATED|RELATED,ESTABLISHED).*-j ACCEPT/, "", function(s){s.est=true;}],
  [/^iptables -D FORWARD 1/, "", function(s){s.est=false;}],
  [/^iptables .*-L|^iptables -nvL/, fwdRules],
  [/^tcpdump .*br1/, function(s){return "listening on br1\n12:31:40.002 IP 10.10.0.2.40218 > 10.20.0.2.8080: Flags [S], seq 99120441, length 0\n12:31:40.002 IP 10.20.0.2.8080 > 10.10.0.2.40218: Flags [S.], seq 30117, ack 99120442, length 0"+(s.est?"\n12:31:40.002 IP 10.10.0.2.40218 > 10.20.0.2.8080: Flags [.], ack 1, length 0":"\n12:31:41.030 IP 10.10.0.2.40218 > 10.20.0.2.8080: Flags [S], seq 99120441, length 0\n12:31:41.030 IP 10.20.0.2.8080 > 10.10.0.2.40218: Flags [S.], seq 30117, ack 99120442, length 0");}],
  [/^tcpdump .*br0/, function(s){return s.est?"listening on br0\n... [S]\n... [S.]\n... [.]":"listening on br0\n12:31:40.002 IP 10.10.0.2.40218 > 10.20.0.2.8080: Flags [S], seq 99120441, length 0\n12:31:41.030 IP 10.10.0.2.40218 > 10.20.0.2.8080: Flags [S], seq 99120441, length 0\n2 packets captured   (no SYN-ACK ever reaches red's side)";}],
  [/^conntrack -L/, function(s){return s.est?"tcp      6 431999 ESTABLISHED src=10.10.0.2 dst=10.20.0.2 sport=40218 dport=8080 src=10.20.0.2 dst=10.10.0.2 sport=8080 dport=40218 [ASSURED]":"tcp      6 58 SYN_RECV src=10.10.0.2 dst=10.20.0.2 sport=40218 dport=8080 src=10.20.0.2 dst=10.10.0.2 sport=8080 dport=40218";}]
 ],
 win:"Say it: the SYN was NEW and allowed. The SYN-ACK travels the other way, and without the ESTABLISHED rule nothing allows it. One rule is the whole difference between stateful and stateless."});

M.push({id:"conntrack", lv:3, title:"Table full", page:"PAGE: edge-14 new connections failing, existing sessions fine",
 brief:"On edge-14, new connections fail intermittently while existing ones keep working. Find the cause, mitigate, then say what filled it.",
 host:"edge-14", st:{max:65536},
 steps:[
  {g:"Read the kernel log", re:/^dmesg/, hint:"dmesg -T | tail"},
  {g:"Compare the table count with its limit", re:/^sysctl net\.netfilter\.nf_conntrack_(count|max)/, hint:"sysctl net.netfilter.nf_conntrack_count net.netfilter.nf_conntrack_max"},
  {g:"Read the conntrack statistics", re:/^conntrack -S/, hint:"conntrack -S"},
  {g:"Mitigate: raise the limit", re:/^sysctl -w net\.netfilter\.nf_conntrack_max=\d+/, when:function(s){return s.max>65536;}, hint:"sysctl -w net.netfilter.nf_conntrack_max=262144"},
  {g:"Look at the flows to find what filled it", re:/^conntrack -L/, hint:"conntrack -L | head"},
  {g:"Name the cause: answer scan | leak | nat", re:/^answer scan/, hint:"Thousands of UNREPLIED flows from one source to port 23."}
 ],
 cmds:[
  [/^dmesg/, "[Thu Nov 12 14:02:11 2026] nf_conntrack: nf_conntrack: table full, dropping packet\n[Thu Nov 12 14:02:11 2026] nf_conntrack: nf_conntrack: table full, dropping packet\n[Thu Nov 12 14:02:16 2026] net_ratelimit: 412 callbacks suppressed\n[Thu Nov 12 14:02:16 2026] nf_conntrack: nf_conntrack: table full, dropping packet"],
  [/^sysctl -w net\.netfilter\.nf_conntrack_max=(\d+)/, function(s,m){return "net.netfilter.nf_conntrack_max = "+m[1];}, function(s,m){s.max=+m[1];}],
  [/^sysctl net\.netfilter\.nf_conntrack_(count|max)/, function(s){return "net.netfilter.nf_conntrack_count = 65536\nnet.netfilter.nf_conntrack_max = "+s.max;}],
  [/^conntrack -S/, "cpu=0   found=0 invalid=118 insert=0 insert_failed=3391 drop=4821 early_drop=907 error=2 search_restart=14\ncpu=1   found=0 invalid=102 insert=0 insert_failed=3274 drop=4610 early_drop=881 error=0 search_restart=9"],
  [/^conntrack -L/, "tcp      6 112 SYN_SENT src=203.0.113.77 dst=10.0.4.11 sport=41002 dport=23 [UNREPLIED] src=10.0.4.11 dst=203.0.113.77 sport=23 dport=41002\ntcp      6 112 SYN_SENT src=203.0.113.77 dst=10.0.4.12 sport=41003 dport=23 [UNREPLIED] src=10.0.4.12 dst=203.0.113.77 sport=23 dport=41003\ntcp      6 111 SYN_SENT src=203.0.113.77 dst=10.0.4.13 sport=41004 dport=23 [UNREPLIED] src=10.0.4.13 dst=203.0.113.77 sport=23 dport=41004\ntcp      6 111 SYN_SENT src=203.0.113.77 dst=10.0.4.14 sport=41005 dport=23 [UNREPLIED] src=10.0.4.14 dst=203.0.113.77 sport=23 dport=41005\n... 61,204 more flows from 203.0.113.77"],
  [/^answer (leak|nat)/, "Look at the flows again: one source, sequential destinations, one port, all UNREPLIED."],
  [/^answer scan/, "Correct. A port scan from one source filled the table with half-open flows. Mitigation was raising the limit. The real fix is dropping the scanner early (raw table, NOTRACK or a block) and alerting at about 80 percent."]
 ],
 win:"Say it: dmesg said table full, dropping packet. New connections fail, old ones work. I raised the max to mitigate, found a scan had filled it, and I'd alert at 80 percent of the limit."});

/* ---------------- Level 4 ---------------- */
function mtuFixed(s){return s.clamp||s.icmp;}
M.push({id:"mtu", lv:4, title:"The black hole", page:"PAGE: SSH to tenant VM works, file copies hang at 0 bytes",
 brief:"Since a tunnel was added between red and green, SSH logins work but big transfers hang. Prove it is MTU, find the real path MTU, and fix it.",
 host:"lab-vm", st:{clamp:false, icmp:false},
 steps:[
  {g:"Reproduce the big transfer", re:/^curl .*10\.20\.0\.2.*big/, hint:"ip netns exec red curl -m 10 -o /dev/null http://10.20.0.2:8080/big.bin"},
  {g:"Ping full-size with Don't Fragment set", re:/^ping .*-M do .*-s 1472|^ping .*-s 1472 .*-M do/, hint:"ip netns exec red ping -c 1 -M do -s 1472 10.20.0.2"},
  {g:"Step the size down until it works", re:/^ping .*-s (\d+)/, when:function(s){return s.okping;}, hint:"1450 minus 28 bytes of headers. Try -s 1422.", solve:"ip netns exec red ping -c 1 -M do -s 1422 10.20.0.2"},
  {g:"Find the interface eating the bytes", re:/^ip (-d )?(-br )?link/, hint:"ip link"},
  {g:"Fix it: clamp MSS, or stop dropping ICMP frag-needed", re:/TCPMSS|^iptables -D FORWARD/, when:mtuFixed, hint:"iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --clamp-mss-to-pmtu"},
  {g:"Retest the transfer", re:/^curl .*10\.20\.0\.2.*big/, when:mtuFixed, hint:"Same curl as step 1.", solve:"ip netns exec red curl -m 10 -o /dev/null http://10.20.0.2:8080/big.bin"}
 ],
 cmds:[
  [/^curl .*10\.20\.0\.2.*big/, function(s){return mtuFixed(s)?"  % Total    % Received % Xferd  Average Speed   Time\n100 50.0M  100 50.0M    0     0   412M      0 --:--:-- --:--:-- --:--:--  413M":"  % Total    % Received % Xferd  Average Speed   Time\n  0 50.0M    0     0    0     0      0      0 --:--:--  0:00:10 --:--:--     0\ncurl: (28) Operation timed out after 10001 milliseconds with 0 out of 52428800 bytes received";}],
  [/^ping .*-s (\d+)/, function(s,m){var n=+m[1]; if(n+28<=1450) return "PING 10.20.0.2 (10.20.0.2) "+n+"("+(n+28)+") bytes of data.\n"+(n+8)+" bytes from 10.20.0.2: icmp_seq=1 ttl=63 time=0.094 ms\n1 packets transmitted, 1 received, 0% packet loss"; return s.icmp? "PING 10.20.0.2 (10.20.0.2) "+n+"("+(n+28)+") bytes of data.\nFrom 10.10.0.1 icmp_seq=1 Frag needed and DF set (mtu = 1450)\n1 packets transmitted, 0 received, +1 errors, 100% packet loss":"PING 10.20.0.2 (10.20.0.2) "+n+"("+(n+28)+") bytes of data.\n\n1 packets transmitted, 0 received, 100% packet loss, time 0ms"; }, function(s,m){ if(+m[1]+28<=1450 && +m[1]>=1000) s.okping=true; }],
  [/^ping .*10\.20\.0\.2/, "64 bytes from 10.20.0.2: icmp_seq=1 ttl=63 time=0.081 ms\n1 packets transmitted, 1 received, 0% packet loss"],
  [/^ip (-d )?(-br )?link/, "1: lo: <LOOPBACK,UP> mtu 65536\n2: eth0: <BROADCAST,MULTICAST,UP> mtu 1500\n3: br0: <BROADCAST,MULTICAST,UP> mtu 1500\n4: br1: <BROADCAST,MULTICAST,UP> mtu 1500\n11: vxlan42: <BROADCAST,MULTICAST,UP> mtu 1450\n    vxlan id 42 remote 192.168.50.31 dev eth0 dstport 4789"],
  [/^iptables -t mangle -[AI] FORWARD.*TCPMSS.*(clamp-mss-to-pmtu|set-mss)/, "", function(s){s.clamp=true;}],
  [/^iptables -D FORWARD (1|.*icmp)/, "", function(s){s.icmp=true;}],
  [/^iptables .*-L|^iptables -nvL/, function(s){return "Chain FORWARD (policy ACCEPT 9120 packets, 688K bytes)\nnum  "+RULES_HEAD+(s.icmp?"":"1      37  2072 DROP       icmp --  *      *       0.0.0.0/0            0.0.0.0/0            icmptype 3 code 4\n");}],
  [/^ip route get/, "10.20.0.2 via 10.10.0.1 dev veth-red src 10.10.0.2 uid 0"]
 ],
 win:"Say it: small packets fit, big ones exceed the tunnel MTU, and the ICMP fragmentation-needed message was being dropped, so the sender never learned. VXLAN costs 50 bytes: 1500 becomes 1450. Fix by clamping MSS, allowing ICMP type 3 code 4, or lowering the MTU."});

M.push({id:"ipsec", lv:4, title:"Tunnel down", page:"PAGE: site-to-site tunnel to customer DC is down",
 brief:"The IPsec tunnel from gw-a to the customer's gateway will not come up. Work out whether packets reach the peer, then read the error name. (Lab knowledge, not production. Say so in the interview.)",
 host:"gw-a", st:{},
 steps:[
  {g:"Are any SAs up?", re:/^swanctl --list-sas/, hint:"swanctl --list-sas"},
  {g:"Do IKE packets flow both ways?", re:/^tcpdump .*(500|4500)/, hint:"tcpdump -ni eth0 udp port 500 or udp port 4500"},
  {g:"Read the strongSwan log", re:/^journalctl .*strongswan/, hint:"journalctl -u strongswan --no-pager | tail"},
  {g:"Name the mismatch: answer proposal | key | subnets | firewall", re:/^answer proposal/, hint:"NO_PROPOSAL_CHOSEN."}
 ],
 cmds:[
  [/^swanctl --list-sas/, "(no SAs)"],
  [/^swanctl --list-conns/, "lab: IKEv2, no reauthentication, rekeying every 14400s\n  local:  198.51.100.10\n  remote: 203.0.113.20\n  local pre-shared key authentication:\n    id: site-a\n  net: TUNNEL, rekeying every 3600s\n    local:  10.100.1.0/24\n    remote: 10.100.2.0/24"],
  [/^cat \/etc\/swanctl\/conf\.d\/lab\.conf/, "connections {\n  lab {\n    version = 2\n    local_addrs = 198.51.100.10\n    remote_addrs = 203.0.113.20\n    proposals = aes256-sha256-modp2048\n    children { net { local_ts = 10.100.1.0/24  remote_ts = 10.100.2.0/24  esp_proposals = aes256-sha256 } }\n  }\n}"],
  [/^tcpdump .*(500|4500)/, "listening on eth0\n15:20:01.110 IP 198.51.100.10.500 > 203.0.113.20.500: isakmp: parent_sa ikev2_init[I]\n15:20:01.171 IP 203.0.113.20.500 > 198.51.100.10.500: isakmp: parent_sa ikev2_init[R]\n15:20:05.112 IP 198.51.100.10.500 > 203.0.113.20.500: isakmp: parent_sa ikev2_init[I]\n15:20:05.170 IP 203.0.113.20.500 > 198.51.100.10.500: isakmp: parent_sa ikev2_init[R]"],
  [/^journalctl .*strongswan/, "charon-systemd[911]: initiating IKE_SA lab[14] to 203.0.113.20\ncharon-systemd[911]: generating IKE_SA_INIT request 0 [ SA KE No N(NATD_S_IP) N(NATD_D_IP) ]\ncharon-systemd[911]: received NO_PROPOSAL_CHOSEN notify error\ncharon-systemd[911]: initiating IKE_SA lab[15] to 203.0.113.20\ncharon-systemd[911]: received NO_PROPOSAL_CHOSEN notify error"],
  [/^ip xfrm (state|policy)/, "(empty: no SAs installed)"],
  [/^answer firewall/, "The capture shows replies coming back from the peer on UDP 500, so the path is open. Read the log."],
  [/^answer (key|subnets)/, "A wrong key is AUTHENTICATION_FAILED. Wrong subnets is TS_UNACCEPTABLE. The log says something else."],
  [/^answer proposal/, "Correct. NO_PROPOSAL_CHOSEN: the two sides do not agree on encryption, integrity or DH group in phase 1. Fix the proposals so they match."]
 ],
 win:"Say it: no SAs, but IKE packets flow both ways, so it isn't a firewall. The log names it: NO_PROPOSAL_CHOSEN is a proposal mismatch. AUTHENTICATION_FAILED is the key or ID, TS_UNACCEPTABLE is the subnets."});

/* ---------------- Level 5 ---------------- */
M.push({id:"flap", lv:5, title:"Flapping backends", page:"PAGE: web-1 flapping UP/DOWN on lb-01 every few seconds",
 brief:"lb-01 keeps marking backend web-1 (10.0.1.11) down and up again. Users are fine most of the time. Find why the health check and real traffic disagree.",
 host:"lb-01", st:{},
 steps:[
  {g:"Read the balancer's log", re:/^journalctl .*\blb\b|^tail .*lb\.log/, hint:"journalctl -u lb --no-pager | tail"},
  {g:"Read the health check settings", re:/^cat \/etc\/lb\/health\.conf/, hint:"cat /etc/lb/health.conf"},
  {g:"Time the health endpoint on web-1", re:/^curl .*10\.0\.1\.11.*health/, hint:"curl -s -o /dev/null -w '%{http_code} %{time_total}\\n' http://10.0.1.11:8080/health"},
  {g:"Time a real page on web-1", re:/^curl (?!.*health).*10\.0\.1\.11/, hint:"curl -s -o /dev/null -w '%{http_code} %{time_total}\\n' http://10.0.1.11:8080/"},
  {g:"Name it: answer timeout | firewall | route | down", re:/^answer timeout/, hint:"Compare the check's timeout with how long /health takes."}
 ],
 cmds:[
  [/^journalctl .*\blb\b|^tail .*lb\.log/, "lb[402]: backend web-1 (10.0.1.11:8080) check timeout after 2000ms (1/2)\nlb[402]: backend web-1 (10.0.1.11:8080) check timeout after 2000ms (2/2) -> DOWN\nlb[402]: backend web-1 (10.0.1.11:8080) check passed (1/2)\nlb[402]: backend web-1 (10.0.1.11:8080) check passed (2/2) -> UP\nlb[402]: backend web-1 (10.0.1.11:8080) check timeout after 2000ms (1/2)\nlb[402]: backend web-2 (10.0.1.12:8080) check passed"],
  [/^cat \/etc\/lb\/health\.conf/, "check_type   = http\ncheck_path   = /health\nexpect       = 200\ninterval     = 5s\ntimeout      = 2s\nfall         = 2     # failures before DOWN\nrise         = 2     # successes before UP"],
  [/^curl .*10\.0\.1\.11.*health/, "200 2.412"],
  [/^curl .*10\.0\.1\.12.*health/, "200 0.031"],
  [/^curl (?!.*health).*10\.0\.1\.11/, "200 0.038"],
  [/^curl (?!.*health).*10\.0\.1\.12/, "200 0.035"],
  [/^nc -zv .*10\.0\.1\.11 8080/, "Connection to 10.0.1.11 8080 port [tcp/*] succeeded!"],
  [/^answer (firewall|route|down)/, "The check gets a 200 from web-1, so it is reachable and up. Look at how long the 200 takes."],
  [/^answer timeout/, "Correct. /health on web-1 answers 200 but takes about 2.4 s, and the check times out at 2 s. Real pages answer in 40 ms. The health endpoint does something slow (often a database call). Fix the endpoint, or tune timeout and thresholds."]
 ],
 win:"Say it: the health check and the real traffic were seeing different things. The check path was slow, the timeout was tight, and fall=2 made it flap. Too aggressive and backends flap, too slow and users hit dead servers."});

/* ---------------- Level 6: Linux events ---------------- */
M.push({id:"disk", lv:6, title:"Full disk, empty du", page:"PAGE: web-03 /var at 100%",
 brief:"web-03 reports /var is 100 percent full, but nobody can find the data. Free the space without guessing.",
 host:"web-03", st:{r:false},
 steps:[
  {g:"Check space", re:/^df -h/, hint:"df -h"},
  {g:"Check inodes", re:/^df -i/, hint:"df -i"},
  {g:"Add up what is actually on /var", re:/^du .*\/var/, hint:"du -xhd1 /var | sort -h"},
  {g:"Find deleted files still held open", re:/^lsof \+L1/, hint:"lsof +L1"},
  {g:"Release the space", re:/^systemctl (restart|reload) nginx/, hint:"systemctl restart nginx"},
  {g:"Confirm", re:/^df -h/, when:function(s){return s.r;}, hint:"df -h"}
 ],
 cmds:[
  [/^df -h/, function(s){return "Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda2        40G   11G   27G  29% /\n/dev/sdb1        50G  "+(s.r?" 3.2G   44G   7%":"  50G     0 100%")+" /var";}],
  [/^df -i/, "Filesystem      Inodes  IUsed   IFree IUse% Mounted on\n/dev/sdb1      3276800 118204 3158596    4% /var"],
  [/^du .*\/var/, "12M\t/var/spool\n148M\t/var/cache\n410M\t/var/lib\n2.6G\t/var/log\n3.2G\t/var"],
  [/^lsof \+L1/, function(s){return s.r?"(nothing)":"COMMAND  PID  USER   FD   TYPE DEVICE    SIZE/OFF NLINK    NODE NAME\nnginx    812  root    5w   REG   8,17 50182340096     0  131099 /var/log/nginx/access.log (deleted)\nnginx    813 nginx    5w   REG   8,17 50182340096     0  131099 /var/log/nginx/access.log (deleted)";}],
  [/^systemctl (restart|reload) nginx/, "", function(s){s.r=true;}],
  [/^ls .*\/var\/log\/nginx/, "total 8\n-rw-r----- 1 nginx adm 4096 Nov 12 09:00 error.log"]
 ],
 win:"Say it: df said full, du said 3 GB. A deleted file was still held open: someone removed a huge access.log while nginx kept writing to it. lsof +L1 finds it, restarting the process frees it. The other cause is running out of inodes, which df -i rules out."});

M.push({id:"sticky", lv:6, title:"The file that won't delete",
 brief:"User alice can read /shared/report.txt but rm fails. You are logged in as alice. Explain why in one word.",
 host:"files-01", user:"alice", st:{},
 steps:[
  {g:"Try the delete", re:/^rm .*\/shared\/report\.txt/, hint:"rm /shared/report.txt"},
  {g:"Look at the directory, not the file", re:/^ls -ld \/shared|^stat \/shared|^namei -l/, hint:"ls -ld /shared"},
  {g:"Look at who owns the file", re:/^ls -l[a-ce-z]* \/shared|^namei -l/, hint:"ls -l /shared/"},
  {g:"Name it: answer <one word>", re:/^answer sticky/, hint:"The t at the end of drwxrwxrwt."}
 ],
 cmds:[
  [/^rm .*\/shared\/report\.txt/, "rm: cannot remove '/shared/report.txt': Operation not permitted"],
  [/^cat \/shared\/report\.txt/, "Q3 capacity report (draft)"],
  [/^ls -ld \/shared/, "drwxrwxrwt 2 root staff 4096 Nov 12 10:14 /shared"],
  [/^stat \/shared/, "  File: /shared\nAccess: (1777/drwxrwxrwt)  Uid: (    0/    root)   Gid: (   50/   staff)"],
  [/^namei -l/, "f: /shared/report.txt\ndrwxr-xr-x root root  /\ndrwxrwxrwt root staff shared\n-rw-rw-r-- bob  staff report.txt"],
  [/^ls -l[a-ce-z]* \/shared/, "total 4\n-rw-rw-r-- 1 bob staff 27 Nov 12 10:14 report.txt"],
  [/^lsattr/, "--------------e------- /shared/report.txt"],
  [/^id$|^whoami/, "uid=1004(alice) gid=1004(alice) groups=1004(alice),50(staff)"],
  [/^answer sticky/, "Correct. The directory has the sticky bit (mode 1777, the trailing t). In a sticky directory only the file's owner, the directory's owner or root can delete or rename a file. Bob owns it, so alice cannot remove it even with write access to the directory."]
 ],
 win:"Say it: deleting needs write and execute on the directory, not on the file. Here the directory is writable, but it's sticky, like /tmp, so only the file's owner, the directory's owner or root can delete."});

M.push({id:"svc", lv:6, title:"nginx will not start", page:"PAGE: web-05 nginx failed after reboot",
 brief:"After a reboot, nginx on web-05 is failed. Read what the service says about itself before changing anything, then get it running.",
 host:"web-05", st:{httpd:true, up:false},
 steps:[
  {g:"Check the service state", re:/^systemctl status nginx/, hint:"systemctl status nginx"},
  {g:"Read its log for the error", re:/^journalctl .*nginx/, hint:"journalctl -u nginx -b --no-pager"},
  {g:"Test the config", re:/^nginx -t/, hint:"nginx -t"},
  {g:"See what holds the port", re:/^ss -[a-z]*l[a-z]*/, hint:"ss -tlnp"},
  {g:"Stop the conflicting service and start nginx", re:/^systemctl (start|restart) nginx/, when:function(s){return s.up;}, hint:"systemctl disable --now httpd, then systemctl start nginx"},
  {g:"Verify from the server", re:/^curl .*localhost|^systemctl (status|is-active) nginx/, when:function(s){return s.up;}, hint:"curl -I localhost"}
 ],
 cmds:[
  [/^systemctl status nginx/, function(s){return s.up?"\u25cf nginx.service - The nginx HTTP and reverse proxy server\n     Active: active (running) since Thu 2026-11-12 16:02:41 EST\n   Main PID: 1904 (nginx)":"\u00d7 nginx.service - The nginx HTTP and reverse proxy server\n     Loaded: loaded (/usr/lib/systemd/system/nginx.service; enabled)\n     Active: failed (Result: exit-code) since Thu 2026-11-12 15:58:10 EST\n    Process: 1012 ExecStart=/usr/sbin/nginx (code=exited, status=1/FAILURE)";}],
  [/^systemctl is-active nginx/, function(s){return s.up?"active":"failed";}],
  [/^journalctl .*nginx/, "nginx[1012]: nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)\nnginx[1012]: nginx: [emerg] bind() to [::]:80 failed (98: Address already in use)\nnginx[1012]: nginx: [emerg] still could not bind()\nsystemd[1]: nginx.service: Control process exited, code=exited, status=1/FAILURE\nsystemd[1]: Failed to start nginx.service - The nginx HTTP and reverse proxy server."],
  [/^nginx -t/, "nginx: the configuration file /etc/nginx/nginx.conf syntax is ok\nnginx: configuration file /etc/nginx/nginx.conf test is successful"],
  [/^ss -[a-z]*l[a-z]*/, function(s){return "State   Recv-Q  Send-Q  Local Address:Port  Process\nLISTEN  0       128     0.0.0.0:22          users:((\"sshd\",pid=701,fd=3))\n"+(s.httpd?"LISTEN  0       511     *:80                users:((\"httpd\",pid=733,fd=4),(\"httpd\",pid=731,fd=4))":(s.up?"LISTEN  0       511     0.0.0.0:80          users:((\"nginx\",pid=1904,fd=6))":""));}],
  [/^systemctl (stop|disable --now|disable) httpd/, function(s,m){return /disable/.test(m[1])?"Removed \"/etc/systemd/system/multi-user.target.wants/httpd.service\".":"";}, function(s,m){ if(m[1]!="disable") s.httpd=false; }],
  [/^(kill|pkill)\b.*(733|731|httpd)/, "", function(s){s.httpd=false;}],
  [/^systemctl (start|restart) nginx/, function(s){return s.httpd?"Job for nginx.service failed because the control process exited with error code.\nSee \"systemctl status nginx.service\" and \"journalctl -xeu nginx.service\" for details.":"";}, function(s){ if(!s.httpd) s.up=true; }],
  [/^curl .*localhost/, function(s){return s.up?"HTTP/1.1 200 OK\nServer: nginx/1.24.0":(s.httpd?"HTTP/1.1 200 OK\nServer: Apache/2.4.57 (Red Hat Enterprise Linux)":"curl: (7) Failed to connect to localhost port 80: Connection refused");}],
  [/^systemctl --failed/, function(s){return s.up?"0 loaded units listed.":"  UNIT          LOAD   ACTIVE SUB    DESCRIPTION\n\u25cf nginx.service loaded failed failed The nginx HTTP and reverse proxy server";}]
 ],
 win:"Say it: I read what the service says about itself first. The journal said Address already in use, the config tested clean, and ss showed httpd on port 80. What changed: httpd was enabled at boot. Stop it, start nginx, verify with curl."});

M.push({id:"iowait", lv:6, title:"Load 20, CPU idle", page:"PAGE: db-02 load average 21 on 4 cores",
 brief:"db-02 has a load average of 21 on 4 cores, yet CPU usage looks low. Work down the slow-server order and name the saturated resource.",
 host:"db-02", st:{},
 steps:[
  {g:"Load versus cores", re:/^uptime|^nproc/, hint:"uptime"},
  {g:"CPU breakdown: is it user time or waiting?", re:/^top|^vmstat/, hint:"vmstat 1 5"},
  {g:"Disk utilisation and latency", re:/^iostat/, hint:"iostat -x 1 3"},
  {g:"Kernel messages", re:/^dmesg/, hint:"dmesg -T | tail"},
  {g:"Name the bottleneck: answer cpu | memory | disk | network", re:/^answer disk/, hint:"wa is 71 percent, sdb is at 100 percent util."}
 ],
 cmds:[
  [/^uptime/, " 16:20:11 up 41 days,  3:02,  2 users,  load average: 21.40, 19.87, 14.02"],
  [/^nproc/, "4"],
  [/^top/, "top - 16:20:14 up 41 days, load average: 21.40, 19.87, 14.02\nTasks: 212 total,   1 running, 189 sleeping,  22 uninterruptible\n%Cpu(s):  3.1 us,  1.9 sy,  0.0 ni, 23.8 id, 71.2 wa,  0.0 hi,  0.0 si\nMiB Mem :  15890 total,   412 free,  9120 used,  6358 buff/cache\n\n  PID USER      PR  NI    VIRT    RES  S  %CPU  %MEM  COMMAND\n 2210 mysql     20   0   12.1g   8.2g  D   2.3  52.8  mysqld\n 3301 root      20   0    9812   3120  D   0.3   0.0  rsync\n 3302 root      20   0    9812   3090  D   0.3   0.0  rsync"],
  [/^vmstat/, "procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu-----\n r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st\n 1 21      0 421888  91204 6420112   0    0   112 48210  902 1811  3  2 24 71  0\n 0 22      0 420112  91204 6420980   0    0    96 47102  884 1790  3  2 23 72  0\n 1 20      0 419904  91204 6421440   0    0   104 49020  915 1840  3  2 25 70  0"],
  [/^free/, "               total        used        free      shared  buff/cache   available\nMem:            15Gi       8.9Gi       402Mi       120Mi       6.2Gi       6.1Gi\nSwap:          4.0Gi          0B       4.0Gi"],
  [/^iostat/, "Device   r/s    w/s   rkB/s    wkB/s  r_await  w_await  aqu-sz  %util\nsda     1.20   3.10   18.40    44.10     0.61     1.02    0.00   0.42\nsdb     9.80 412.00  104.00 48120.00    41.20   912.40   38.71 100.00"],
  [/^dmesg/, "[Thu Nov 12 16:11:02 2026] blk_update_request: I/O error, dev sdb, sector 88120448 op 0x1:(WRITE)\n[Thu Nov 12 16:11:02 2026] sd 2:0:1:0: [sdb] tag#14 FAILED Result: hostbyte=DID_OK driverbyte=DRIVER_SENSE\n[Thu Nov 12 16:14:40 2026] INFO: task mysqld:2210 blocked for more than 120 seconds."],
  [/^ps .*/, "USER   PID %CPU %MEM STAT COMMAND\nmysql 2210  2.3 52.8 Dsl  /usr/sbin/mysqld\nroot  3301  0.3  0.0 D    rsync -a /var/lib/mysql/ /backup/\nroot  3302  0.3  0.0 D    rsync -a /var/lib/mysql/ /backup/"],
  [/^answer (cpu|memory|network)/, "CPU is 24 percent idle and 71 percent waiting. Memory has 6 GB available and no swap in use. What are the tasks waiting on?"],
  [/^answer disk/, "Correct. Load counts tasks in uninterruptible I/O wait as well as tasks wanting CPU. 22 tasks are blocked (b column, D state), wa is 71 percent, sdb is at 100 percent util with 900 ms write latency, and dmesg shows I/O errors on sdb. A failing disk plus a backup rsync on top."]
 ],
 win:"Say it: load counts tasks waiting on I/O, not just CPU. vmstat showed high wa and a large b column, iostat showed one disk saturated, and dmesg showed errors on it."});

M.push({id:"oom", lv:6, title:"The OOM killer", page:"PAGE: shared-12 site returning 502, processes being killed",
 brief:"A hosting server keeps killing processes and the site throws 502s. Prove whether it is memory, see whether it is swapping right now, and name the process to cap.",
 host:"shared-12", st:{},
 steps:[
  {g:"Memory totals", re:/^free/, hint:"free -h"},
  {g:"Is it actively swapping? Watch si and so", re:/^vmstat/, hint:"vmstat 1 3"},
  {g:"Did the kernel kill anything?", re:/^dmesg|^journalctl -k/, hint:"dmesg -T | grep -i -E 'oom|killed'"},
  {g:"Who is using the memory?", re:/^ps .*(sort|mem)|^top/, hint:"ps aux --sort=-%mem | head"},
  {g:"Which service gets a lower limit? answer <name>", re:/^answer php-?fpm/, hint:"61 children at about 240 MB each."}
 ],
 cmds:[
  [/^free/, "               total        used        free      shared  buff/cache   available\nMem:            15Gi        15Gi       118Mi        88Mi       201Mi        96Mi\nSwap:          2.0Gi       2.0Gi        12Mi"],
  [/^vmstat/, "procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu-----\n r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st\n 9  6 2084112 120932   1204 204880 4120 6890  4410  7012 2204 5120 41 22  4 33  0\n11  7 2084900 118440   1180 201112 3980 7102  4102  7240 2190 5012 43 21  3 33  0\n 8  6 2085120 119204   1192 202004 4204 6644  4388  6810 2231 5204 40 23  5 32  0"],
  [/^dmesg|^journalctl -k/, "[Thu Nov 12 17:02:44 2026] php-fpm invoked oom-killer: gfp_mask=0x140cca, order=0, oom_score_adj=0\n[Thu Nov 12 17:02:44 2026] Out of memory: Killed process 20114 (php-fpm) total-vm:612044kB, anon-rss:248120kB\n[Thu Nov 12 17:04:09 2026] Out of memory: Killed process 20388 (php-fpm) total-vm:608820kB, anon-rss:244904kB\n[Thu Nov 12 17:05:51 2026] Out of memory: Killed process 1422 (mysqld) total-vm:4120880kB, anon-rss:1820044kB"],
  [/^ps .*(sort|mem)|^top/, "USER       PID %CPU %MEM    RSS COMMAND\nmysql    21904  6.1 11.2 1790M /usr/sbin/mysqld\nacct42   20544  3.0  1.5  246M php-fpm: pool acct42\nacct42   20545  2.9  1.5  244M php-fpm: pool acct42\nacct42   20546  3.1  1.5  241M php-fpm: pool acct42\nacct42   20547  2.8  1.5  240M php-fpm: pool acct42\n... 57 more php-fpm: pool acct42 (pm.max_children = 80)"],
  [/^(cat|grep) .*php-fpm/, "pm = dynamic\npm.max_children = 80\npm.start_servers = 10"],
  [/^answer (mysql|mysqld)/, "mysqld was a victim, not the cause. It is one process at 1.8 GB. What has 61 copies?"],
  [/^answer php-?fpm/, "Correct. 61 php-fpm children at about 240 MB each is roughly 14.6 GB on a 15 GB host. Lower pm.max_children so the pool cannot outgrow RAM, then find why requests are slow enough to pile up."]
 ],
 win:"Say it, mechanism first: swap is disk the kernel uses when RAM is full, and disk is far slower than RAM. Used swap alone isn't the problem. si and so in vmstat show active swapping, which means slowness right now. When RAM and swap both run out, the OOM killer ends a process and dmesg shows it."});

M.push({id:"selinux", lv:6, title:"SELinux says no", page:"PAGE: app-07 returning 403 after content move",
 brief:"Content was moved to /srv/www and now nginx returns 403. File permissions look right. Find the real denial and fix it without disabling SELinux.",
 host:"app-07", st:{fix:false},
 steps:[
  {g:"Reproduce from the server", re:/^curl .*localhost/, hint:"curl -I localhost"},
  {g:"Check plain permissions", re:/^ls -l[a-z]* \/srv\/www/, hint:"ls -l /srv/www"},
  {g:"Check the SELinux mode", re:/^getenforce|^sestatus/, hint:"getenforce"},
  {g:"Find the denial", re:/^ausearch -m avc/, hint:"ausearch -m avc -ts recent"},
  {g:"Look at the file's context", re:/^ls -[a-zA-Z]*Z[a-zA-Z]* /, hint:"ls -Z /srv/www"},
  {g:"Fix the labels", re:/^restorecon -[A-Za-z]*R[A-Za-z]* \/srv\/www|^chcon .*httpd_sys_content_t.*\/srv\/www/, hint:"semanage fcontext -a -t httpd_sys_content_t '/srv/www(/.*)?' then restorecon -Rv /srv/www"},
  {g:"Verify", re:/^curl .*localhost/, when:function(s){return s.fix;}, hint:"curl -I localhost"}
 ],
 cmds:[
  [/^curl .*localhost/, function(s){return s.fix?"HTTP/1.1 200 OK\nServer: nginx/1.24.0":"HTTP/1.1 403 Forbidden\nServer: nginx/1.24.0";}],
  [/^ls -[a-zA-Z]*Z[a-zA-Z]* /, function(s){return s.fix?"unconfined_u:object_r:httpd_sys_content_t:s0 index.html":"unconfined_u:object_r:var_t:s0 index.html";}],
  [/^ls -l[a-z]* \/srv\/www/, "total 4\n-rw-r--r--. 1 nginx nginx 612 Nov 12 11:40 index.html"],
  [/^getenforce/, "Enforcing"],
  [/^sestatus/, "SELinux status:                 enabled\nCurrent mode:                   enforcing"],
  [/^setenforce 0/, "Don't. Disabling SELinux hides the problem and removes the protection. Fix the label instead."],
  [/^ausearch -m avc/, function(s){return s.fix?"<no matches>":"time->Thu Nov 12 17:31:02 2026\ntype=AVC msg=audit(1794522662.114:882): avc:  denied  { read } for  pid=1904 comm=\"nginx\" name=\"index.html\" dev=\"sda2\" ino=920114 scontext=system_u:system_r:httpd_t:s0 tcontext=unconfined_u:object_r:var_t:s0 tclass=file permissive=0";}],
  [/^semanage fcontext .*httpd_sys_content_t.*\/srv\/www/, ""],
  [/^restorecon -[A-Za-z]*R[A-Za-z]* \/srv\/www|^chcon .*httpd_sys_content_t.*\/srv\/www/, "Relabeled /srv/www/index.html from unconfined_u:object_r:var_t:s0 to unconfined_u:object_r:httpd_sys_content_t:s0", function(s){s.fix=true;}],
  [/^tail .*nginx.*error|^journalctl .*nginx/, "[error] 1904#0: *12 open() \"/srv/www/index.html\" failed (13: Permission denied), client: 127.0.0.1, request: \"HEAD / HTTP/1.1\""]
 ],
 win:"Say it: permission denied with correct permissions means check SELinux. ausearch -m avc showed httpd_t denied read on a var_t file. Moved files keep their old context. Fix the label with semanage fcontext and restorecon. Don't just disable SELinux."});

M.push({id:"bash", lv:6, title:"One-liners from memory",
 brief:"The Technical Drill says: write these from memory. /var/log/nginx/access.log is in the current directory as access.log. The HackerRank round is log parsing in Bash or Python.",
 host:"web-03", st:{},
 steps:[
  {g:"Top client IPs in access.log, ranked by count", re:/awk .*\$1.*access\.log.*\| ?sort.*\| ?uniq -c.*\| ?sort -[a-z]*r?n?[a-z]*/, hint:"awk '{print $1}' access.log | sort | uniq -c | sort -rn | head"},
  {g:"Count HTTP status codes", re:/awk .*\$9.*access\.log.*\| ?sort.*\| ?uniq -c/, hint:"awk '{print $9}' access.log | sort | uniq -c | sort -rn"},
  {g:"Print mounts over 90 percent full", re:/^df -hP? ?\| ?awk .*\$5.*90/, hint:"df -hP | awk 'NR>1 && $5+0 > 90 {print $6, $5}'"},
  {g:"Restart nginx only if it is not active", re:/^systemctl is-active (--quiet )?nginx ?\|\| ?systemctl (re)?start nginx/, hint:"systemctl is-active --quiet nginx || systemctl restart nginx"},
  {g:"Errors from the journal in the last hour", re:/^journalctl .*--since .*1 hour ago.*-p err|^journalctl .*-p err.*--since/, hint:"journalctl --since '1 hour ago' -p err --no-pager"}
 ],
 cmds:[
  [/awk .*\$1.*access\.log.*\| ?sort.*\| ?uniq -c.*\| ?sort -[a-z]*r?n?[a-z]*/, "   4812 203.0.113.77\n    912 198.51.100.4\n    388 192.0.2.19\n    201 198.51.100.88\n     97 192.0.2.140"],
  [/awk .*\$9.*access\.log.*\| ?sort.*\| ?uniq -c/, "   5120 200\n    844 404\n    301 502\n    118 301\n     27 403"],
  [/^df -hP? ?\| ?awk .*\$5.*90/, "/var 100%"],
  [/^systemctl is-active (--quiet )?nginx ?\|\| ?systemctl (re)?start nginx/, ""],
  [/^journalctl .*(--since .*1 hour ago.*-p err|-p err.*--since)/, "Nov 12 16:58:10 web-03 nginx[812]: [error] upstream timed out (110: Connection timed out) while reading response header from upstream\nNov 12 17:02:44 web-03 kernel: Out of memory: Killed process 20114 (php-fpm)"],
  [/^head .*access\.log|^cat access\.log/, "203.0.113.77 - - [12/Nov/2026:16:50:01 -0500] \"GET /wp-login.php HTTP/1.1\" 404 162 \"-\" \"curl/8.4\"\n198.51.100.4 - - [12/Nov/2026:16:50:02 -0500] \"GET / HTTP/1.1\" 200 5120 \"-\" \"Mozilla/5.0\"\n192.0.2.19 - - [12/Nov/2026:16:50:02 -0500] \"GET /api/items HTTP/1.1\" 502 150 \"-\" \"Mozilla/5.0\""],
  [/^(sort|uniq|awk|cut|grep)\b/, "(This lab only checks the five target pipelines. Field 1 is the client IP, field 9 is the status code. uniq only merges adjacent lines, so sort first.)"]
 ],
 win:"The pattern to keep: awk picks the field, sort groups it, uniq -c counts it, sort -rn ranks it."});

M.push({id:"k8s", lv:6, title:"Service with no endpoints", page:"PAGE: web Service not responding, pods Running",
 brief:"The web Service returns nothing, but all three pods are Running and Ready. Follow the path: client, Service IP, endpoints, pod IP.",
 host:"k3s-01", st:{fix:false},
 steps:[
  {g:"Are the pods healthy?", re:/^(k3s )?kubectl get po(ds?)?\b/, hint:"kubectl get pods"},
  {g:"Does the Service have endpoints?", re:/^(k3s )?kubectl get (endpoints|ep)\b/, hint:"kubectl get endpoints web"},
  {g:"What selector does the Service use?", re:/^(k3s )?kubectl describe (svc|service) web/, hint:"kubectl describe svc web"},
  {g:"What labels do the pods carry?", re:/^(k3s )?kubectl get po(ds?)? .*--show-labels/, hint:"kubectl get pods --show-labels"},
  {g:"Fix the selector", re:/^(k3s )?kubectl set selector (svc|service)[ \/]web .*app=web-api|^answer selector/, hint:"kubectl set selector svc web app=web-api"},
  {g:"Confirm endpoints appear", re:/^(k3s )?kubectl get (endpoints|ep)\b/, when:function(s){return s.fix;}, hint:"kubectl get endpoints web"}
 ],
 cmds:[
  [/^(k3s )?kubectl get po(ds?)? .*--show-labels/, "NAME                       READY   STATUS    RESTARTS   AGE   LABELS\nweb-api-7c9d8f6b5d-2xk4q   1/1     Running   0          3h    app=web-api,pod-template-hash=7c9d8f6b5d\nweb-api-7c9d8f6b5d-8hm2z   1/1     Running   0          3h    app=web-api,pod-template-hash=7c9d8f6b5d\nweb-api-7c9d8f6b5d-qv7tn   1/1     Running   0          3h    app=web-api,pod-template-hash=7c9d8f6b5d"],
  [/^(k3s )?kubectl get po(ds?)?\b/, "NAME                       READY   STATUS    RESTARTS   AGE\nweb-api-7c9d8f6b5d-2xk4q   1/1     Running   0          3h\nweb-api-7c9d8f6b5d-8hm2z   1/1     Running   0          3h\nweb-api-7c9d8f6b5d-qv7tn   1/1     Running   0          3h"],
  [/^(k3s )?kubectl get (endpoints|ep)\b/, function(s){return "NAME   ENDPOINTS                                      AGE\nweb    "+(s.fix?"10.42.0.14:8080,10.42.0.15:8080,10.42.1.9:8080":"<none>                                        ")+"   3h";}],
  [/^(k3s )?kubectl get (svc|service)/, "NAME   TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)   AGE\nweb    ClusterIP   10.43.118.20   <none>        80/TCP    3h"],
  [/^(k3s )?kubectl describe (svc|service) web/, function(s){return "Name:              web\nNamespace:         default\nSelector:          app="+(s.fix?"web-api":"web")+"\nType:              ClusterIP\nIP:                10.43.118.20\nPort:              http  80/TCP\nTargetPort:        8080/TCP\nEndpoints:         "+(s.fix?"10.42.0.14:8080,10.42.0.15:8080,10.42.1.9:8080":"<none>");}],
  [/^(k3s )?kubectl set selector (svc|service)[ \/]web .*app=web-api/, "service/web selector updated", function(s){s.fix=true;}],
  [/^answer selector/, "Right diagnosis. The Service selects app=web, the pods are labelled app=web-api. In the real cluster: kubectl set selector svc web app=web-api, or fix the manifest.", function(s){s.fix=true;}],
  [/^(k3s )?kubectl logs/, "listening on :8080"]
 ],
 win:"Say it: I check whether the Service has endpoints. Empty endpoints mean the selector does not match the pod labels, or the pods are not Ready. Then port against targetPort."});

/* ---------------- Level 6: more Linux events ---------------- */
M.push({id:"sshkey", lv:6, title:"Permission denied (publickey)", page:"PAGE: deploy user cannot SSH to app-03, pipeline blocked",
 brief:"The deploy user's key stopped working on app-03 after someone 'fixed permissions'. You are on the console as root. Find why sshd refuses the key and repair it.",
 host:"app-03", st:{d:false,f:false},
 steps:[
  {g:"Reproduce the login", re:/^ssh .*deploy@/, hint:"ssh deploy@localhost"},
  {g:"Read what sshd says", re:/^journalctl .*ssh|^(tail|grep) .*\/var\/log\/(secure|auth)/, hint:"journalctl -u sshd --no-pager | tail"},
  {g:"Check the modes on .ssh and the key file", re:/^ls -[a-z]+ .*\.ssh|^stat .*\.ssh|^namei -l/, hint:"ls -ld /home/deploy/.ssh; then ls -l /home/deploy/.ssh"},
  {g:"Set .ssh to 700 and authorized_keys to 600", re:/^chmod /, when:function(s){return s.d&&s.f;}, hint:"chmod 700 /home/deploy/.ssh  then  chmod 600 /home/deploy/.ssh/authorized_keys"},
  {g:"Log in again", re:/^ssh .*deploy@/, when:function(s){return s.d&&s.f;}, hint:"ssh deploy@localhost"}
 ],
 cmds:[
  [/^ssh .*deploy@/, function(s){return s.d&&s.f?"Last login: Thu Nov 12 09:14:02 2026 from 10.0.3.9\n[deploy@app-03 ~]$ logout\nConnection to localhost closed.":"deploy@localhost: Permission denied (publickey,gssapi-keyex,gssapi-with-mic).";}],
  [/^journalctl .*ssh|^(tail|grep) .*\/var\/log\/(secure|auth)/, function(s){return s.d&&s.f?"sshd[2290]: Accepted publickey for deploy from 127.0.0.1 port 51220 ssh2: ED25519 SHA256:k3Yx...":"sshd[2204]: Authentication refused: bad ownership or modes for "+(s.d?"file /home/deploy/.ssh/authorized_keys":"directory /home/deploy/.ssh")+"\nsshd[2204]: Connection closed by authenticating user deploy 127.0.0.1 port 51188 [preauth]";}],
  [/^ls -[a-z]*d[a-z]* .*\.ssh/, function(s){return (s.d?"drwx------":"drwxrwxrwx")+". 2 deploy deploy 4096 Nov 12 08:50 /home/deploy/.ssh";}],
  [/^ls -[a-ce-z]+ .*\.ssh/, function(s){return "total 4\n"+(s.f?"-rw-------":"-rw-rw-rw-")+". 1 deploy deploy 98 Oct  2 11:20 authorized_keys";}],
  [/^(stat|namei -l) .*\.ssh/, function(s){return "/home/deploy/.ssh  mode "+(s.d?"0700":"0777")+"  deploy:deploy\n/home/deploy/.ssh/authorized_keys  mode "+(s.f?"0600":"0666")+"  deploy:deploy";}],
  [/^chmod 0?700 \/home\/deploy\/\.ssh\/?$/, "", function(s){s.d=true;}],
  [/^chmod 0?600 \/home\/deploy\/\.ssh\/authorized_keys$/, "", function(s){s.f=true;}],
  [/^chmod /, "(mode changed, but check the target and the value: .ssh wants 700, authorized_keys wants 600)"],
  [/^getenforce/, "Permissive"],
  [/^ss -[a-z]*l/, "LISTEN 0 128 0.0.0.0:22 users:((\"sshd\",pid=701,fd=3))"]
 ],
 win:"Say it: port 22 answered, so it wasn't the network. The sshd log named it: bad ownership or modes. sshd refuses a key when .ssh or authorized_keys is writable by others. 700 on the directory, 600 on the file."});

M.push({id:"cron", lv:6, title:"The cron job that never ran", page:"PAGE: nightly backup missing on backup-01",
 brief:"Last night's backup did not appear. The script works when you run it by hand. Find out whether cron fired, what the job printed, and why it failed.",
 host:"backup-01", st:{},
 steps:[
  {g:"Read the crontab", re:/^crontab .*-l|^cat \/var\/spool\/cron/, hint:"crontab -l -u backup"},
  {g:"Did cron fire the job?", re:/^journalctl .*cron|^(grep|tail|cat) .*(CRON|\/var\/log\/cron)/, hint:"journalctl -u crond --since yesterday --no-pager"},
  {g:"Read the job's own output", re:/^(cat|tail|less) .*backup\.log/, hint:"tail /var/log/backup.log"},
  {g:"Find where the script lives", re:/^(which|type|command -v|ls|find) .*backup\.sh/, hint:"which backup.sh"},
  {g:"Name the cause: answer path | permissions | disk | timezone", re:/^answer path/, hint:"cron runs with PATH=/usr/bin:/bin."}
 ],
 cmds:[
  [/^crontab .*-l|^cat \/var\/spool\/cron/, "# m h dom mon dow command\n0 2 * * * backup.sh >> /var/log/backup.log 2>&1"],
  [/^journalctl .*cron|^(grep|tail|cat) .*(CRON|\/var\/log\/cron)/, "Nov 12 02:00:01 backup-01 CROND[18220]: (backup) CMD (backup.sh >> /var/log/backup.log 2>&1)\nNov 12 02:00:01 backup-01 CROND[18219]: (backup) CMDEND (backup.sh >> /var/log/backup.log 2>&1)"],
  [/^(cat|tail|less) .*backup\.log/, "/bin/sh: line 1: backup.sh: command not found\n/bin/sh: line 1: backup.sh: command not found"],
  [/^(which|type|command -v) .*backup\.sh/, "/usr/local/bin/backup.sh"],
  [/^(ls|find) .*backup\.sh/, "-rwxr-xr-x. 1 backup backup 1840 Sep  3 10:02 /usr/local/bin/backup.sh"],
  [/^echo \$PATH/, "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/root/bin"],
  [/^df -h/, "/dev/sdc1       500G  212G  288G  43% /backup"],
  [/^answer (permissions|disk|timezone)/, "The script is executable, the disk has room, and cron fired at 02:00 as scheduled. Read what the job printed."],
  [/^answer path/, "Correct. Cron fired, and the shell said command not found. Cron runs with a minimal PATH (/usr/bin:/bin), so /usr/local/bin is not searched. Use the full path in the crontab, or set PATH at the top of it."]
 ],
 win:"Say it: check the cron log to see whether it fired, then the job's own output. Cron has a minimal environment, so use full paths and always redirect output to a log."});

M.push({id:"inode", lv:6, title:"No space left, 41% used", page:"PAGE: web-08 uploads failing with 'No space left on device'",
 brief:"Uploads on web-08 fail with No space left on device, but the disk is less than half full. Find what ran out and clear it safely.",
 host:"web-08", st:{c:false},
 steps:[
  {g:"Reproduce", re:/^touch /, hint:"touch /var/www/test"},
  {g:"Check space", re:/^df -h/, hint:"df -h /var"},
  {g:"Check inodes", re:/^df -i/, hint:"df -i /var"},
  {g:"Find the directory holding the files", re:/^du --inodes|^find \/var.*\|/, hint:"du --inodes -xd3 /var | sort -n | tail"},
  {g:"Delete the stale files without a glob", re:/^find \/var\/lib\/php\/session.* -delete/, hint:"find /var/lib/php/session -type f -mtime +1 -delete"},
  {g:"Confirm", re:/^df -i/, when:function(s){return s.c;}, hint:"df -i /var"}
 ],
 cmds:[
  [/^touch /, function(s){return s.c?"":"touch: cannot touch '/var/www/test': No space left on device";}],
  [/^df -h/, "Filesystem      Size  Used Avail Use% Mounted on\n/dev/sdb1        80G   33G   47G  41% /var"],
  [/^df -i/, function(s){return "Filesystem      Inodes   IUsed   IFree IUse% Mounted on\n/dev/sdb1      5242880 "+(s.c?" 214880 5028000    5%":"5242880       0  100%")+" /var";}],
  [/^du --inodes|^find \/var.*\|/, function(s){return s.c?"     212\t/var/lib/php/session\n  118204\t/var/lib\n  214880\t/var":"    4120\t/var/log\n   88204\t/var/www\n 5028212\t/var/lib/php/session\n 5146416\t/var/lib\n 5242880\t/var";}],
  [/^rm .*\/var\/lib\/php\/session/, "-bash: /usr/bin/rm: Argument list too long"],
  [/^ls .*\/var\/lib\/php\/session/, "(5 million entries. ls will hang for minutes. Count with find or du --inodes instead.)"],
  [/^find \/var\/lib\/php\/session.* -delete/, "", function(s){s.c=true;}]
 ],
 win:"Say it: df -h showed space, df -i showed 100 percent of inodes used. Millions of tiny PHP session files. rm with a glob fails with Argument list too long, so find -delete. The real fix is making session cleanup run."});

M.push({id:"fstab", lv:6, title:"Emergency mode after a reboot", page:"PAGE: db-04 did not come back from maintenance reboot",
 brief:"db-04 dropped into emergency mode after a reboot. You are on the console. Find the failed unit, fix the cause, and make sure a missing data disk can never stop boot again.",
 host:"db-04", st:{rw:false,fix:false},
 steps:[
  {g:"Find what failed", re:/^systemctl --failed|^journalctl -x?b/, hint:"systemctl --failed"},
  {g:"Read fstab", re:/^cat \/etc\/fstab/, hint:"cat /etc/fstab"},
  {g:"Check which disks and UUIDs exist", re:/^blkid|^lsblk/, hint:"blkid"},
  {g:"Remount root read-write", re:/^mount -o (remount,rw|rw,remount) \/$/, hint:"mount -o remount,rw /"},
  {g:"Make the mount non-fatal: answer <option>, or edit fstab with sed", re:/^answer nofail|^sed -i .*\/etc\/fstab/, when:function(s){return s.fix;}, hint:"answer nofail"},
  {g:"Test before rebooting", re:/^mount -a/, when:function(s){return s.fix;}, hint:"mount -a"}
 ],
 cmds:[
  [/^systemctl --failed/, "  UNIT       LOAD   ACTIVE SUB    DESCRIPTION\n● data.mount loaded failed failed /data\n\n1 loaded units listed."],
  [/^journalctl -x?b/, "systemd[1]: dev-disk-by\\x2duuid-7c1e\\x2d4f02.device: Job dev-disk-by\\x2duuid-7c1e\\x2d4f02.device/start timed out.\nsystemd[1]: Timed out waiting for device /dev/disk/by-uuid/7c1e-4f02.\nsystemd[1]: Dependency failed for /data.\nsystemd[1]: Dependency failed for Local File Systems.\nsystemd[1]: Started Emergency Shell."],
  [/^cat \/etc\/fstab/, function(s){return "UUID=a1b2-9f30  /      xfs  defaults        0 0\nUUID=c4d5-2e11  /boot  xfs  defaults        0 0\nUUID=7c1e-4f02  /data  xfs  defaults"+(s.fix?",nofail":"")+"  0 0";}],
  [/^blkid/, "/dev/sda1: UUID=\"c4d5-2e11\" TYPE=\"xfs\"\n/dev/sda2: UUID=\"a1b2-9f30\" TYPE=\"xfs\""],
  [/^lsblk/, "NAME   SIZE TYPE MOUNTPOINT\nsda     80G disk\n├─sda1   1G part /boot\n└─sda2  79G part /"],
  [/^mount -o (remount,rw|rw,remount) \/$/, "", function(s){s.rw=true;}],
  [/^sed -i .*\/etc\/fstab/, function(s){return s.rw?"":"sed: couldn't open temporary file /etc/sedk2Jx1a: Read-only file system";}, function(s){ if(s.rw)s.fix=true; }],
  [/^answer nofail/, function(s){return s.rw?"Correct. nofail added to the /data line. A missing non-critical disk now logs an error instead of stopping boot.":"Right option, but root is still mounted read-only, so you can't save the edit yet.";}, function(s){ if(s.rw)s.fix=true; }],
  [/^mount -a/, function(s){return s.fix?"mount: /data: can't find UUID=7c1e-4f02.   (reported, not fatal: nofail)":"mount: /data: can't find UUID=7c1e-4f02.";}],
  [/^answer /, "Think about the mount option that lets boot continue when a device is absent."]
 ],
 win:"Say it: the journal said it timed out waiting for a device, and blkid showed that UUID no longer exists. Boot to emergency mode, remount root read-write, fix /etc/fstab. Use nofail for non-critical mounts, and test with mount -a before rebooting."});

M.push({id:"clock", lv:6, title:"Certificate is not yet valid", page:"PAGE: api-02 TLS errors to every upstream",
 brief:"api-02 suddenly fails every outbound HTTPS call with a certificate error, yet the same certificates work from other hosts. Find what is different about this host.",
 host:"api-02", st:{ok:false},
 steps:[
  {g:"Reproduce", re:/^curl .*https/, hint:"curl -sI https://auth.internal"},
  {g:"Check the clock", re:/^date|^timedatectl/, hint:"timedatectl status"},
  {g:"Check the time service", re:/^systemctl (status|is-active) chronyd|^chronyc/, hint:"systemctl status chronyd"},
  {g:"Start time sync and keep it on", re:/^systemctl (enable --now|start) chronyd/, hint:"systemctl enable --now chronyd"},
  {g:"Retest", re:/^curl .*https/, when:function(s){return s.ok;}, hint:"curl -sI https://auth.internal"}
 ],
 cmds:[
  [/^curl .*https/, function(s){return s.ok?"HTTP/2 200\nserver: nginx":"curl: (60) SSL certificate problem: certificate is not yet valid\nMore details here: https://curl.se/docs/sslcerts.html";}],
  [/^date/, function(s){return s.ok?"Thu Nov 12 17:48:20 EST 2026":"Mon Jan  1 00:14:09 EST 2024";}],
  [/^timedatectl/, function(s){return "               Local time: "+(s.ok?"Thu 2026-11-12 17:48:20 EST":"Mon 2024-01-01 00:14:09 EST")+"\n                Time zone: America/New_York (EST, -0500)\nSystem clock synchronized: "+(s.ok?"yes":"no")+"\n              NTP service: "+(s.ok?"active":"inactive");}],
  [/^systemctl (status|is-active) chronyd/, function(s){return s.ok?"● chronyd.service - NTP client/server\n     Active: active (running)":"○ chronyd.service - NTP client/server\n     Loaded: loaded (/usr/lib/systemd/system/chronyd.service; disabled)\n     Active: inactive (dead)";}],
  [/^chronyc/, function(s){return s.ok?"Reference ID    : A9FEA97B (time.internal)\nStratum         : 3\nSystem time     : 0.000012 seconds fast of NTP time\nLeap status     : Normal":"506 Cannot talk to daemon";}],
  [/^systemctl (enable --now|start) chronyd/, function(s,m){return m[1]==="start"?"":"Created symlink /etc/systemd/system/multi-user.target.wants/chronyd.service";}, function(s){s.ok=true;}],
  [/^openssl s_client/, "notBefore=Mar  3 00:00:00 2026 GMT\nnotAfter=Mar  3 23:59:59 2027 GMT"]
 ],
 win:"Say it: the certificate was fine. The host thought it was January 2024, before the certificate's start date. Wrong time breaks TLS, logs and clustering. timedatectl showed no sync, chronyd was disabled, so enable it and alert on clock drift."});

M.push({id:"nofile", lv:6, title:"Too many open files", page:"PAGE: api-05 returning 500s under load",
 brief:"The api service on api-05 (PID 2291) throws 500s at peak. Find the limit it is hitting, confirm it with a count, and raise it the right way.",
 host:"api-05", st:{edit:false,reload:false,up:false},
 steps:[
  {g:"Read the service log", re:/^journalctl .*api/, hint:"journalctl -u api --no-pager | tail"},
  {g:"Read the process limits", re:/^(cat|grep) .*\/proc\/2291\/limits|^systemctl show api/, hint:"grep 'open files' /proc/2291/limits"},
  {g:"Count its open file descriptors", re:/^ls \/proc\/2291\/fd ?\| ?wc -l|^lsof -p 2291 ?\| ?wc/, hint:"ls /proc/2291/fd | wc -l"},
  {g:"Raise the limit with a drop-in override", re:/^systemctl edit api/, hint:"systemctl edit api"},
  {g:"Reload systemd and restart the service", re:/^systemctl restart api/, when:function(s){return s.up;}, hint:"systemctl daemon-reload  then  systemctl restart api"},
  {g:"Verify the new limit", re:/^systemctl show api|^(cat|grep) .*\/proc\/\d+\/limits/, when:function(s){return s.up;}, hint:"systemctl show api -p LimitNOFILE"}
 ],
 cmds:[
  [/^journalctl .*api/, function(s){return s.up?"api[3310]: listening on :8443":"api[2291]: accept tcp [::]:8443: accept4: too many open files\napi[2291]: http: Accept error: accept tcp [::]:8443: accept4: too many open files; retrying in 1s\napi[2291]: dial tcp 10.0.6.12:5432: socket: too many open files";}],
  [/^(cat|grep) .*\/proc\/\d+\/limits/, function(s){return "Limit                     Soft Limit           Hard Limit           Units\nMax open files            "+(s.up?"65536                65536":"1024                 4096 ")+"                files";}],
  [/^systemctl show api/, function(s){return "LimitNOFILE="+(s.up?"65536":"1024")+"\nLimitNOFILESoft="+(s.up?"65536":"1024");}],
  [/^ls \/proc\/2291\/fd ?\| ?wc -l|^lsof -p 2291 ?\| ?wc/, function(s){return s.up?"ls: cannot access '/proc/2291/fd': No such file or directory (the service restarted with a new PID)":"1024";}],
  [/^ulimit -n/, "1024   (that's this shell's limit, not the service's)"],
  [/^systemctl edit api/, "[editor] wrote /etc/systemd/system/api.service.d/override.conf:\n\n[Service]\nLimitNOFILE=65536", function(s){s.edit=true;}],
  [/^systemctl daemon-reload/, "", function(s){s.reload=true;}],
  [/^systemctl restart api/, function(s){return !s.edit?"(restarted, same limit: nothing was changed yet)":(!s.reload?"Warning: The unit file, source configuration file or drop-ins of api.service changed on disk. Run 'systemctl daemon-reload' to reload units.":"");}, function(s){ if(s.edit&&s.reload)s.up=true; }]
 ],
 win:"Say it: the log said too many open files, the process limit was 1024, and it had exactly 1024 descriptors open. A service's limit comes from its unit, not from ulimit in my shell. systemctl edit for a drop-in with LimitNOFILE, daemon-reload, restart. Then ask whether it's a leak."});

M.push({id:"spin", lv:6, title:"One process at 99% CPU", page:"PAGE: worker-02 CPU pegged, queue not draining",
 brief:"A worker process on worker-02 sits at 99 percent CPU and the job queue isn't draining. Find out what it is actually doing before you kill anything.",
 host:"worker-02", st:{ok:false},
 steps:[
  {g:"Find the process", re:/^top|^ps |^pidstat/, hint:"top"},
  {g:"See what system calls it makes", re:/^strace .*4410/, hint:"strace -p 4410"},
  {g:"Check the dependency it keeps calling", re:/^ss .*|^systemctl (status|is-active) redis|^nc -zv .*6379/, hint:"systemctl status redis"},
  {g:"Bring the dependency back", re:/^systemctl (start|restart) redis/, hint:"systemctl start redis"},
  {g:"Confirm the worker calmed down", re:/^top|^ps |^pidstat/, when:function(s){return s.ok;}, hint:"top"}
 ],
 cmds:[
  [/^top|^pidstat/, function(s){return "top - 18:02:10 up 12 days, load average: "+(s.ok?"0.31, 0.72, 1.01":"1.98, 1.92, 1.64")+"\n%Cpu(s): "+(s.ok?" 4.0 us,  1.2 sy, 94.6 id":"31.0 us, 68.2 sy,  0.8 id")+",  0.0 wa\n\n  PID USER     %CPU %MEM COMMAND\n 4410 worker   "+(s.ok?" 3.1":"99.3")+"  1.2 python3 worker.py\n  812 root      0.3  0.1 sshd";}],
  [/^ps /, function(s){return "USER    PID %CPU %MEM STAT COMMAND\nworker 4410 "+(s.ok?" 3.1":"99.3")+"  1.2 R    python3 worker.py";}],
  [/^strace .*4410/, function(s){return s.ok?"epoll_wait(5, [{events=EPOLLIN, data={u32=7}}], 64, 5000) = 1\nrecvfrom(7, \"*3\\r\\n$5\\r\\nBLPOP\"..., 4096, 0, NULL, NULL) = 44\n^C":"socket(AF_INET, SOCK_STREAM|SOCK_CLOEXEC, IPPROTO_TCP) = 7\nconnect(7, {sa_family=AF_INET, sin_port=htons(6379), sin_addr=inet_addr(\"127.0.0.1\")}, 16) = -1 ECONNREFUSED (Connection refused)\nclose(7) = 0\nsocket(AF_INET, SOCK_STREAM|SOCK_CLOEXEC, IPPROTO_TCP) = 7\nconnect(7, {sa_family=AF_INET, sin_port=htons(6379), sin_addr=inet_addr(\"127.0.0.1\")}, 16) = -1 ECONNREFUSED (Connection refused)\nclose(7) = 0\n... (repeats thousands of times per second) ^C";}],
  [/^ss .*/, function(s){return "LISTEN 0 128 0.0.0.0:22   users:((\"sshd\",pid=812,fd=3))"+(s.ok?"\nLISTEN 0 511 127.0.0.1:6379 users:((\"redis-server\",pid=5120,fd=6))":"");}],
  [/^nc -zv .*6379/, function(s){return s.ok?"Connection to 127.0.0.1 6379 port [tcp/redis] succeeded!":"nc: connect to 127.0.0.1 port 6379 (tcp) failed: Connection refused";}],
  [/^systemctl (status|is-active) redis/, function(s){return s.ok?"● redis.service - Redis persistent key-value database\n     Active: active (running)":"○ redis.service - Redis persistent key-value database\n     Active: inactive (dead) since Thu 2026-11-12 17:40:02 EST\n    Process: 911 ExecStart=/usr/bin/redis-server (code=killed, signal=KILL)";}],
  [/^systemctl (start|restart) redis/, "", function(s){s.ok=true;}],
  [/^kill/, "Not yet. Killing it hides the cause and it will spin again on restart. Find out what it is doing first."]
 ],
 win:"Say it: high sy time means the process is busy in system calls. strace showed a tight loop of refused connections to port 6379: the worker retries with no backoff when Redis is down. Refused means reached and nothing listening. Start the dependency, then file the missing backoff as the real bug."});

M.push({id:"reboot", lv:6, title:"Who rebooted it?", page:"PAGE: edge-07 restarted unexpectedly at 03:12",
 brief:"edge-07 has an uptime of four minutes and nobody scheduled a reboot. Work out what happened from the previous boot's evidence.",
 host:"edge-07", st:{},
 steps:[
  {g:"Confirm when it came up", re:/^uptime|^who -b/, hint:"uptime"},
  {g:"Read the reboot and shutdown records", re:/^last /, hint:"last -x | head"},
  {g:"Read the end of the previous boot's journal", re:/^journalctl .*-b ?-1/, hint:"journalctl -b -1 -e --no-pager"},
  {g:"Name the cause: answer oom | panic | power | human", re:/^answer (human|person|user|manual|jsmith)/, hint:"A clean shutdown record and a sudo line."}
 ],
 cmds:[
  [/^uptime/, " 03:16:40 up 4 min,  1 user,  load average: 0.42, 0.31, 0.12"],
  [/^who -b/, "         system boot  2026-11-12 03:12"],
  [/^last /, "root     pts/0        10.0.9.4         Thu Nov 12 03:15   still logged in\nreboot   system boot  5.14.0-427.el9   Thu Nov 12 03:12   still running\nshutdown system down  5.14.0-427.el9   Thu Nov 12 03:11 - 03:12  (00:00)\njsmith   pts/1        10.0.9.31        Thu Nov 12 02:58 - 03:11  (00:13)"],
  [/^journalctl .*-b ?-1/, "Nov 12 03:11:02 edge-07 sudo[8812]:   jsmith : TTY=pts/1 ; PWD=/home/jsmith ; USER=root ; COMMAND=/usr/sbin/reboot\nNov 12 03:11:02 edge-07 systemd-logind[640]: System is rebooting.\nNov 12 03:11:03 edge-07 systemd[1]: Stopping dataplane.service...\nNov 12 03:11:09 edge-07 systemd[1]: Reached target Reboot.\nNov 12 03:11:09 edge-07 systemd[1]: Shutting down."],
  [/^dmesg/, "(current boot only: nothing unusual. The previous boot's messages are in journalctl -b -1.)"],
  [/^answer (oom|panic|power)/, "An OOM or panic leaves kernel messages and no clean shutdown record. A power loss leaves no shutdown record at all. Here there is a clean 'system down' line."],
  [/^answer (human|person|user|manual|jsmith)/, "Correct. A clean shutdown record, and a sudo line: jsmith ran reboot at 03:11 from 10.0.9.31. Not a crash. The follow-up is a conversation and a change process, not a kernel bug."]
 ],
 win:"Say it: last -x shows whether the shutdown was clean, and journalctl -b -1 shows the previous boot. A crash has no clean shutdown record. This one had one, and a sudo line naming who ran it."});

/* ---------------- Level 7 ---------------- */
M.push({id:"gate", lv:7, title:"The rollout gate", page:"CHANGE: dataplane v2.14 rollout window is open",
 brief:"You are rolling a new dataplane state to the edge fleet with Salt. One host first, then the health gate. Read the exit code and decide.",
 host:"salt-master", st:{one:false},
 steps:[
  {g:"See which minions answer", re:/^salt ['"]?\*['"]? test\.ping/, hint:"salt '*' test.ping"},
  {g:"Dry run on the first host", re:/^salt ['"]?edge-01['"]? state\.apply dataplane test=True/, hint:"salt 'edge-01' state.apply dataplane test=True"},
  {g:"Apply to one host only", re:/^salt ['"]?edge-01['"]? state\.apply dataplane$/, hint:"salt 'edge-01' state.apply dataplane"},
  {g:"Run the health gate and print its exit code", re:/^python3? (\.\/)?healthcheck\.py .*echo .*\$\?/, when:function(s){return s.one;}, hint:"python3 healthcheck.py 10.20.0.2:8080 10.20.0.2:9090; echo \"exit=$?\"", solve:"python3 healthcheck.py 10.20.0.2:8080 10.20.0.2:9090; echo exit=$?"},
  {g:"Decide: answer continue | stop", re:/^answer stop/, hint:"Exit 1 means a target failed."}
 ],
 cmds:[
  [/^salt ['"]?\*['"]? test\.ping/, "edge-01:\n    True\nedge-02:\n    True\nedge-03:\n    True\nedge-04:\n    True\n... 1,196 more minions returned True"],
  [/^salt ['"]?edge-01['"]? state\.apply dataplane test=True/, "edge-01:\n----------\n          ID: dataplane-binary\n    Function: file.managed\n      Result: None\n     Comment: The file /usr/local/bin/dataplane is set to be changed\n----------\n          ID: dataplane-service\n    Function: service.running\n      Result: None\n     Comment: Service dataplane is set to be restarted\n\nSummary for edge-01\n------------\nSucceeded: 2 (unchanged=2, changed=0)   <- test mode: nothing was changed"],
  [/^salt ['"]?edge-01['"]? state\.apply dataplane$/, "edge-01:\n  Name: /usr/local/bin/dataplane - Function: file.managed - Result: Changed\n  Name: dataplane - Function: service.running - Result: Changed\n\nSummary for edge-01\n------------\nSucceeded: 2 (changed=2)\nFailed:    0", function(s){s.one=true;}],
  [/^salt -b \S+ ['"]?\*['"]? state\.apply dataplane/, function(s){return "Hold on. The health gate has not passed. Batch mode is for after the canary bakes clean.";}],
  [/^python3? (\.\/)?healthcheck\.py/, function(s,m,cmd){var o=s.one?"OK   10.20.0.2:8080               0.4 ms\nFAIL 10.20.0.2:9090            timed out\n1/2 healthy":"OK   10.20.0.2:8080               0.4 ms\nOK   10.20.0.2:9090               0.5 ms\n2/2 healthy"; if(/echo/.test(cmd)) o+="\nexit="+(s.one?1:0); return o;}],
  [/^cat healthcheck\.py/, "#!/usr/bin/env python3\n\"\"\"Check that each host:port accepts a TCP connection. Exit 1 if any fail.\"\"\"\nimport socket, sys, time\n\ndef check(host, port, timeout=2.0):\n    start = time.monotonic()\n    try:\n        with socket.create_connection((host, port), timeout=timeout):\n            return True, (time.monotonic() - start) * 1000\n    except OSError as e:\n        return False, str(e)\n\ndef main(targets):\n    failed = 0\n    for t in targets:\n        host, port = t.rsplit(\":\", 1)\n        ok, detail = check(host, int(port))\n        if ok:\n            print(f\"OK   {t:25} {detail:6.1f} ms\")\n        else:\n            print(f\"FAIL {t:25} {detail}\")\n            failed += 1\n    print(f\"{len(targets) - failed}/{len(targets)} healthy\")\n    return 1 if failed else 0\n\nif __name__ == \"__main__\":\n    if len(sys.argv) < 2:\n        sys.exit(\"usage: healthcheck.py host:port [host:port ...]\")\n    sys.exit(main(sys.argv[1:]))"],
  [/^answer continue/, "Exit code 1 means a target failed after the change. A gate that fails stops the rollout by itself. That is the point of the gate."],
  [/^answer stop/, "Correct. Port 9090 timed out after the change on edge-01, the gate exited 1, and the rollout stops. Next: roll back edge-01 (flag first, binary second), confirm with the same check, then debug on that one host."]
 ],
 win:"Say it: one host, then a canary group, then a region, then the rest, with bake time and a health gate between phases. The exit code is what makes the script useful: a pipeline stops on exit 1. Roll back by flag first, binary second."});

window.MISSIONS = M;
})();
