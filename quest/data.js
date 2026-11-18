/* Core levels: generic material only. Company and personal details live in packs/.
   Levels: lesson HTML + multiple-choice quiz. In every quiz item the FIRST option is the
   correct one; the page shuffles options before showing them. */
window.RANKS = ["Tier 1 Support","Tier 2 Support","Junior Sysadmin","Sysadmin","Network Troubleshooter","Firewall Keeper","On-call Engineer","SRE I","SRE II"];

window.LEVELS = [
{n:0, name:"Signal Check", sub:"How to answer before what to answer",
 intro:"Most interviews are lost on delivery, not knowledge. This level is the five rules that fix delivery. Everything after it is knowledge.",
 lesson:`
<h3>The five rules</h3>
<ol class="rules">
<li><b>Answer the exact question in your first sentence.</b> Detail comes second. Under 90 seconds. If they want more, they'll ask.</li>
<li><b>No apologies.</b> Not for the format, not for nerves, not at the end. Open with <q>Happy to dive in.</q> Three seconds of silence to think is fine.</li>
<li><b>The gap sentence.</b> <q>I haven't done that in production. Here's how I understand it, and here's what I did in my lab.</q> It turns a gap into evidence.</li>
<li><b>When a question comes back twice,</b> they want one specific idea. Stop and say <q>The core of it is…</q> in one sentence.</li>
<li><b>Every claim gets a 30-second story right after it.</b> <q>My strength is calm, structured troubleshooting</q> and then stopping is half an answer.</li>
</ol>
<h3>The shape of every concept answer</h3>
<p>What it is, why it matters, how you'd see it. Mechanism first, then consequence. Swap: <i>disk space the kernel uses when RAM is full</i> (what), <i>disk is far slower than RAM</i> (why), <i>si and so in vmstat</i> (how you'd see it).</p>
<h3>Own your background</h3>
<p>Don't apologise for where you started. A support background is years of solving hard production problems for customers under pressure. Say it that way.</p>
<h3>Precise terms</h3>
<p>On a networking team the pairs matter: SNAT vs DNAT, stateful vs stateless, DROP vs REJECT, L2 vs L3, 401 vs 403. Every tool on your resume gets a two-sentence definition.</p>`,
 quiz:[
 {q:"The interviewer asks the same question a second time. What do you do?", o:["Stop and give one sentence: \"The core of it is…\"","Repeat the answer with more detail","Apologise and ask to come back to it","Switch to a related story"], e:"A repeated question means they want one specific idea."},
 {q:"You're asked about production IPsec. You have only done it in a lab.", o:["\"I haven't done that in production. Here's how I understand it, and here's what I did in my lab.\"","\"Sorry, I don't really have experience with that.\"","Answer as if the lab were production","\"That's not something I've needed to know.\""], e:"The gap sentence turns a gap into evidence. Never call a lab production, and never apologise."},
 {q:"How should an answer start?", o:["With one sentence that answers the exact question","With background so the answer makes sense","With the story it reminds you of","With what you're unsure about"], e:"Answer first, detail second. They'll ask if they want more."},
 {q:"Which opening line?", o:["\"Happy to dive in.\"","\"Sorry, I'm a bit nervous today.\"","\"I hope this format is okay for me.\"","\"I just got back from a trip, so bear with me.\""], e:"Calm start, no apologies anywhere."},
 {q:"You say \"my strength is calm, structured troubleshooting.\" What comes next?", o:["A 30-second story that shows it","Nothing. Short answers are better","A second strength","A weakness, for balance"], e:"Every claim gets a story right after it. The claim alone is half an answer."},
 {q:"What's the order for explaining any concept?", o:["What it is, why it matters, how you'd see it","History, definition, alternatives","Commands first, then the idea","An example, then another example"], e:"Mechanism first, then the consequence, then the observable sign. That's the swap answer done right."}
 ]},

{n:1, name:"The Wire", sub:"Addresses, subnets, layer 2, layer 3, TCP",
 intro:"Fundamentals they will test directly. Subnetting has to be instant, and ARP explains more outages than people expect.",
 lesson:`
<h3>An address has two parts</h3>
<p>32 bits. The prefix says how many bits name the network. <code>10.10.0.2/24</code>: the first 24 bits are the network, the last 8 are the host.</p>
<div class="scroll"><table class="t"><tr><th>Prefix</th><th>Mask</th><th>Addresses</th><th>Usable</th></tr>
<tr><td>/24</td><td>255.255.255.0</td><td>256</td><td>254</td></tr><tr><td>/25</td><td>.128</td><td>128</td><td>126</td></tr>
<tr><td>/26</td><td>.192</td><td>64</td><td>62</td></tr><tr><td>/27</td><td>.224</td><td>32</td><td>30</td></tr>
<tr><td>/28</td><td>.240</td><td>16</td><td>14</td></tr><tr><td>/29</td><td>.248</td><td>8</td><td>6</td></tr>
<tr><td>/30</td><td>.252</td><td>4</td><td>2</td></tr></table></div>
<p><b>The fast method:</b> block size = 256 minus the last mask octet that isn't 255. Networks start at multiples of the block size. <code>10.0.1.77/26</code>: block 64, so .0 .64 .128 .192. 77 sits in <b>.64</b>. Broadcast .127. Hosts .65 to .126.</p>
<p>Private ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16. Two networks with the same range can't be routed to each other without NAT. That is the classic multi-cloud pain.</p>
<h3>Layer 2 and layer 3</h3>
<div data-dg="l2l3"></div>
<p>Layer 2 moves <b>frames by MAC</b> inside one broadcast domain: switches. Layer 3 routes <b>packets by IP</b> between networks: routers, longest prefix match, TTL minus 1 per hop. A host makes one check: is the destination on my subnet? Yes: deliver directly. No: send to my default gateway.</p>
<p><b>ARP connects the two.</b> <q>Who has 10.10.0.3? Tell 10.10.0.2.</q> For a destination on another subnet the host ARPs for the <b>gateway's</b> MAC, never the far host's. <code>ip neigh</code>: REACHABLE is fresh, FAILED or INCOMPLETE is a layer 2 problem.</p>
<p class="say">When the wrong MAC answers for an IP, everything above layer 2 looks broken. Always check which MAC answers.</p>
<h3>TCP in one picture</h3>
<div data-dg="handshake"></div>
<div class="scroll"><table class="t"><tr><th>Client sees</th><th>On the wire</th></tr>
<tr><td>Succeeded</td><td>SYN, SYN-ACK, ACK all made it.</td></tr>
<tr><td>Timed out</td><td>The SYN or SYN-ACK was dropped. The client retransmits and gives up.</td></tr>
<tr><td>Connection refused</td><td>The SYN reached the host and an RST came back: nothing listening, or a REJECT.</td></tr>
<tr><td>No route to host</td><td>No route, ARP for the next hop failed, or an ICMP unreachable came back.</td></tr></table></div>
<p>States in <code>ss</code>: LISTEN, SYN-SENT, ESTABLISHED, TIME-WAIT (normal), CLOSE-WAIT (the other side closed and your app didn't: many of these is an application bug). UDP has no handshake: DNS, SNMP, VXLAN and IKE.</p>`,
 quiz:[
 {q:"How many usable hosts in a /27?", o:["30","32","62","14"], e:"A /27 has 32 addresses, minus network and broadcast."},
 {q:"Which network is 10.0.1.77/26 in?", o:["10.0.1.64","10.0.1.0","10.0.1.76","10.0.1.128"], e:"Block size 256 - 192 = 64. Networks start at .0, .64, .128, .192. 77 falls in .64."},
 {q:"What is the broadcast address of 192.168.5.200/27?", o:["192.168.5.223","192.168.5.255","192.168.5.207","192.168.5.224"], e:"Block size 32. 200 is in the .192 block, and broadcast is one below the next block (.224)."},
 {q:"Are 10.1.1.10 and 10.1.1.20 on the same /28?", o:["No. One is in .0 to .15, the other in .16 to .31","Yes. Both are below .32","Yes. A /28 holds 30 hosts","No. A /28 only holds 2 hosts"], e:"A /28 is blocks of 16. Different blocks, so they need a router."},
 {q:"A host's IP is 10.0.2.15/23. Is 10.0.3.200 on its network?", o:["Yes. 10.0.2.0/23 runs from 10.0.2.0 to 10.0.3.255","No. The third octet differs","No. A /23 is smaller than a /24","Only if a route is added"], e:"A /23 covers two /24s starting on an even third octet."},
 {q:"A host sends a packet to another subnet. Whose MAC does it ARP for?", o:["Its default gateway's","The destination host's","The destination's switch","Nobody. ARP is only for the local host"], e:"The IP header names the final destination. The Ethernet header names the next hop."},
 {q:"In the lab, the ping reply came back with ttl=63 instead of 64. What does that prove?", o:["The packet crossed one router","One packet was lost","The MTU was reduced by one","The reply was NATed"], e:"Every router hop subtracts 1 from TTL. It was routed, not switched."},
 {q:"ip neigh shows the gateway as FAILED. What kind of problem is it?", o:["Layer 2: nobody answered ARP for that IP","Layer 3: the route is missing","DNS: the name didn't resolve","Layer 4: the port is closed"], e:"FAILED or INCOMPLETE means the ARP request got no answer."},
 {q:"ss shows hundreds of sockets in CLOSE-WAIT. What does it suggest?", o:["The application isn't closing its sockets","A firewall is dropping FINs","The server is under a SYN flood","Normal behaviour on a busy server"], e:"CLOSE-WAIT: the other side closed, your app hasn't. TIME-WAIT is the normal one."},
 {q:"The client says \"Connection refused\". What happened on the wire?", o:["The SYN reached the host and a reset came back","The SYN was dropped silently","DNS returned no address","The route to the host is missing"], e:"Refused means reached: nothing listening on that port, or a firewall REJECT."}
 ]},

{n:2, name:"The Lost Packet", sub:"A packet never arrived. Walk me through it.",
 intro:"Packet-level troubleshooting is the core of any infrastructure interview. The method below answers about half of what they can ask. Learn it as a speech.",
 lesson:`
<h3>The method</h3>
<div data-dg="path"></div>
<ol class="rules">
<li><b>Define it.</b> Source, destination, port, protocol, when it started, and what changed. A rollout, a firewall rule or a route change is the most likely cause, so ask that first.</li>
<li><b>Reproduce from the source</b> with <code>nc -zv</code> or <code>curl -v</code> and read the symptom.</li>
<li><b>On the source:</b> <code>ip route get</code> shows the route and source IP the kernel will use. <code>ip neigh</code> shows whether ARP for the gateway resolved.</li>
<li><b>Capture on both ends at once</b> with tcpdump. Find the last place the packet appears.</li>
<li><b>In the path:</b> firewall counters, conntrack for the flow, <code>mtr</code> for per-hop loss, and in a cloud the security group or cloud firewall and the subnet routes.</li>
<li><b>Confirm with the same test,</b> write it into the runbook, add a check or alert.</li>
</ol>
<p class="say">The 20-second version: I split the path in half. I reproduce from the source, read the symptom, then capture on both ends at once to see the last place the packet appears. That tells me whether it's the source, the path, the destination, or the return path.</p>
<h3>Symptom to meaning</h3>
<div class="scroll"><table class="t"><tr><th>You see</th><th>It usually means</th></tr>
<tr><td>Timeout, SYN retransmits</td><td>Dropped silently: a firewall DROP, missing route, host down, or a return path problem.</td></tr>
<tr><td>Connection refused</td><td>Reached the host. Nothing listening, or a firewall replied with a reset (REJECT).</td></tr>
<tr><td>No route to host</td><td>No route, ARP for the next hop failed, or an ICMP host-unreachable.</td></tr>
<tr><td>Ping works, TCP fails</td><td>A firewall filters by port, or nothing is listening.</td></tr>
<tr><td>Small works, big transfers hang</td><td>MTU black hole.</td></tr>
<tr><td>Works from one host, not another</td><td>Source-specific: an allowlist, a route on one host, a different NAT path.</td></tr>
<tr><td>Works by IP, fails by name</td><td>DNS.</td></tr>
<tr><td>Works for a while, then new connections fail</td><td>conntrack table full or port exhaustion.</td></tr></table></div>
<h3>Reading the three verdicts from a capture</h3>
<ul>
<li>SYN leaves the source and <b>never arrives</b>: the path.</li>
<li>SYN arrives, <b>no SYN-ACK goes back</b>: the destination. A closed port would send a reset, so silence means a drop before the socket: an INPUT rule, <code>rp_filter</code>, or a full SYN backlog.</li>
<li>SYN-ACK leaves but <b>never gets back</b>: the return path. Asymmetric routing, or a stateful device that never saw the SYN.</li>
</ul>
<h3>The tools</h3>
<div class="scroll"><table class="t"><tr><th>Command</th><th>Use it for</th></tr>
<tr><td><code>ip route get 10.0.2.5</code></td><td>The exact route and source IP the kernel will use.</td></tr>
<tr><td><code>ip neigh</code></td><td>The ARP table.</td></tr>
<tr><td><code>ss -tlnp</code></td><td>Listening sockets with processes.</td></tr>
<tr><td><code>tcpdump -ni eth0 host X and port Y</code></td><td>Watch packets. <code>-w file.pcap</code> saves. <code>-e</code> shows MACs.</td></tr>
<tr><td><code>tshark -r file.pcap -Y filter</code></td><td>Read a capture with no GUI.</td></tr>
<tr><td><code>mtr -rwc 50 host</code></td><td>Per-hop loss and latency.</td></tr>
<tr><td><code>nc -zv host port</code></td><td>Test a TCP port.</td></tr>
<tr><td><code>iptables -L -v -n --line-numbers</code></td><td>Rules with hit counters. Counters show which rule eats packets.</td></tr>
<tr><td><code>nstat</code>, <code>ethtool -S eth0</code></td><td>Kernel and NIC counters: retransmits, listen drops, errors.</td></tr></table></div>
<p>tshark filters to know: <code>tcp.flags.syn==1 &amp;&amp; tcp.flags.ack==0</code> (attempts), <code>tcp.flags.reset==1</code> (refused), <code>tcp.analysis.retransmission</code> (loss), <code>icmp.type==3</code> (unreachable and frag-needed).</p>`,
 quiz:[
 {q:"\"A packet never arrived.\" What is the first step?", o:["Define it: source, destination, port, protocol, when it started, what changed","Start tcpdump on the destination","Restart the service on the destination","Check the firewall rules on every hop"], e:"Define and ask what changed first. A rollout, rule or route change is the most likely cause."},
 {q:"nc -zv times out. What does a timeout tell you?", o:["Something dropped the packet silently","The host answered but nothing is listening","DNS could not resolve the name","The port is open but slow"], e:"Timeout = dropped: a DROP rule, a missing route, a dead host, or a broken return path."},
 {q:"tcpdump on the server shows the SYN arriving, but no SYN-ACK goes back. Why isn't this just a closed port?", o:["A closed port would send a reset. Silence means a drop before the socket","A closed port also stays silent","Closed ports never receive SYNs","Because tcpdump can't see resets"], e:"Check INPUT firewall counters, rp_filter, and a full SYN backlog (nstat, ListenDrops). Confirm the listener with ss -tlnp."},
 {q:"The SYN-ACK leaves the server but the client never gets it.", o:["Return path: asymmetric routing or a stateful device that never saw the SYN","The server's listener is down","The client's DNS is wrong","The SYN was dropped by the server firewall"], e:"ip route get from the server to the client, mtr from both sides. A reply without a tracked SYN shows as INVALID in conntrack."},
 {q:"Ping works but TCP to 443 fails.", o:["A firewall filters by port, or nothing is listening","The route is missing","ARP failed","The MTU is too small"], e:"ICMP passing proves the route and layer 2. Use nc -zv: timeout points at a drop, refused at no listener or a REJECT."},
 {q:"Which command shows the route and source IP the kernel will actually use?", o:["ip route get <destination>","ip neigh","ss -tlnp","traceroute <destination>"], e:"ip route get shows the exact decision: gateway, interface, source IP. Use it in every troubleshooting answer."},
 {q:"New connections work for a while, then start failing. Existing ones stay up.", o:["conntrack table full or port exhaustion","MTU black hole","DNS TTL expired","Asymmetric routing"], e:"Check dmesg for table full and conntrack -S."},
 {q:"Which tshark filter shows connection attempts only?", o:["tcp.flags.syn==1 && tcp.flags.ack==0","tcp.flags.reset==1","tcp.analysis.retransmission","tcp.port==443"], e:"A SYN without ACK is the client's first packet. SYN with ACK set is the server's reply."},
 {q:"In a capture you see a SYN, then RST,ACK straight back.", o:["A closed port or a firewall REJECT","A silent drop","Packet loss in the path","A slow receiver"], e:"That's what refused looks like on the wire."},
 {q:"It works from one host and fails from another, same destination.", o:["Source-specific: an allowlist, a route on one host, or a different NAT path","The destination service is down","The destination has an MTU problem","DNS is broken for everyone"], e:"Compare ip route get and the source IP seen at the destination from both hosts."}
 ]},

{n:3, name:"The Gatekeepers", sub:"Stateful firewalls, conntrack, iptables, nftables",
 intro:"Every firewall front end writes rules like these underneath. This level names the mechanics in the terms a firewall team uses.",
 lesson:`
<h3>Stateless vs stateful</h3>
<p>A stateless filter is a bouncer with no memory: it checks every packet alone, so you need rules for both directions. A stateful firewall remembers: allow the <b>NEW</b> connection once, and replies pass because they belong to an <b>ESTABLISHED</b> flow.</p>
<ul><li><b>Stateful:</b> Linux iptables and nftables with conntrack, AWS security groups, and most managed cloud firewalls.</li>
<li><b>Stateless:</b> AWS network ACLs, basic router ACLs.</li></ul>
<h3>conntrack is the memory</h3>
<p>Each entry stores the 5-tuple in both directions, with a state: <b>NEW</b> (first packet), <b>ESTABLISHED</b> (seen both ways), <b>RELATED</b> (a new flow tied to a known one, like an ICMP error about it), <b>INVALID</b> (fits nothing).</p>
<p><code>conntrack -L</code> lists flows. <code>conntrack -S</code> shows drops. The table has a limit, <code>nf_conntrack_max</code>. When it fills, the kernel logs <code>nf_conntrack: table full, dropping packet</code> and <b>new connections fail while existing ones keep working</b>. Raise the limit to mitigate, find what filled it, alert at about 80 percent.</p>
<h3>Where the rules run</h3>
<div data-dg="chains"></div>
<p>Tables group rules by job: filter, nat, mangle, raw. <b>DNAT in PREROUTING, SNAT in POSTROUTING.</b> Rules are checked top to bottom, first match wins, then the chain's policy decides.</p>
<h3>DROP vs REJECT</h3>
<div class="scroll"><table class="t"><tr><th></th><th>DROP</th><th>REJECT</th></tr>
<tr><td>Does</td><td>Discards silently.</td><td>Discards and sends a TCP reset or ICMP error.</td></tr>
<tr><td>Client sees</td><td>A timeout after retries.</td><td>Connection refused, instantly.</td></tr>
<tr><td>tcpdump</td><td>SYN, SYN, SYN.</td><td>SYN, then RST.</td></tr>
<tr><td>Why</td><td>Reveals nothing to scanners.</td><td>Fails fast, easier to debug.</td></tr></table></div>
<h3>nftables</h3>
<p>The modern replacement: one tool (<code>nft</code>), chains you define, sets and maps, atomic rule replacement. On current distros <code>iptables</code> is often <code>iptables-nft</code>, a layer that writes nftables rules. <code>nft list ruleset</code> shows everything. <b>Gotcha:</b> if an iptables chain and your own nft chain both hook FORWARD, a packet must be accepted by both. A drop in either wins.</p>
<h3>Cloud firewall or guest firewall?</h3>
<p>A managed cloud firewall usually filters before traffic reaches the server, so <code>tcpdump</code> in the guest sees nothing. A guest iptables drop shows the SYNs arriving with no reply. The test is whether the packet reaches the guest at all. <span class="note">Check the provider's docs, and say it as documented unless you tested it.</span></p>
<h3>Don't lock yourself out</h3>
<p>Recover through console access. Then make the next change undo itself: CSF testing mode flushes rules on a timer until you confirm, or an <code>at</code> job restores the old rules in five minutes. One host before the fleet. That's a small automatic rollback.</p>`,
 quiz:[
 {q:"What does a stateful firewall do that a stateless one doesn't?", o:["Tracks connections, so replies to allowed flows pass automatically","Inspects the HTTP payload","Encrypts traffic between hosts","Filters by MAC address"], e:"Stateless filters judge every packet alone, so they need rules both ways."},
 {q:"Which of these is stateless?", o:["An AWS network ACL","An AWS security group","A managed cloud firewall with connection tracking","iptables with a conntrack ESTABLISHED rule"], e:"Security groups are stateful. Network ACLs judge each packet alone."},
 {q:"You delete the ESTABLISHED,RELATED rule. A port with its own ACCEPT rule for NEW connections now…", o:["Times out, because the SYN-ACK coming back is dropped","Still works, the ACCEPT rule covers it","Returns connection refused","Works one way only for UDP"], e:"The SYN is NEW and allowed. The reply travels the other way and nothing allows it."},
 {q:"A client hits a DROP rule. What does it see?", o:["A timeout after retransmits","Connection refused, instantly","No route to host","A TLS error"], e:"DROP is silent. REJECT is the one that fails fast."},
 {q:"The path through iptables for a packet the host routes:", o:["PREROUTING, routing decision, FORWARD, POSTROUTING","PREROUTING, INPUT, OUTPUT, POSTROUTING","INPUT, FORWARD, OUTPUT","OUTPUT, routing decision, POSTROUTING"], e:"To a local process: PREROUTING then INPUT. From a local process: OUTPUT then POSTROUTING."},
 {q:"Why can't SNAT happen in PREROUTING?", o:["The kernel hasn't picked the outgoing interface yet, so it doesn't know which source address to use","PREROUTING only handles ICMP","SNAT needs the packet to be encrypted first","It can, but it's slower"], e:"DNAT is in PREROUTING so the kernel routes to the new destination. SNAT is in POSTROUTING, after routing."},
 {q:"dmesg shows \"nf_conntrack: table full, dropping packet\". What do users experience?", o:["New connections fail, existing ones keep working","All connections drop at once","Only UDP is affected","DNS stops resolving but TCP is fine"], e:"Existing flows already have entries. New ones can't be inserted."},
 {q:"An ICMP error about a connection that's already tracked has which conntrack state?", o:["RELATED","NEW","INVALID","ESTABLISHED"], e:"RELATED is a new flow tied to an existing one."},
 {q:"An iptables chain and your own nftables chain both hook FORWARD. A packet is accepted by one and dropped by the other.", o:["It's dropped. It must be accepted by both","It's accepted. First accept wins","iptables always takes priority","nftables always takes priority"], e:"A drop in either hook wins."},
 {q:"How do you tell a managed cloud firewall drop from a guest firewall drop?", o:["Whether the packet reaches the guest: tcpdump in the guest sees nothing for a cloud firewall drop","A cloud firewall always sends a reset","Guest drops are logged in the cloud console","Only guest firewalls can drop ICMP"], e:"A guest iptables drop shows the SYNs arriving with no reply."},
 {q:"You pushed a firewall rule and locked yourself out. Best prevention next time?", o:["Make the change undo itself: CSF testing mode or a timed restore job, and one host before the fleet","Always keep two SSH sessions open","Disable the firewall before changing rules","Only change rules during business hours"], e:"An automatic rollback beats being careful."}
 ]},

{n:4, name:"Shapeshifters and Tunnels", sub:"NAT, MTU, overlays, IPsec, BGP, IPv6",
 intro:"NAT, MTU and overlays are where cloud networking incidents live. If IPsec and BGP are lab knowledge for you, know the shape and use the gap sentence.",
 lesson:`
<h3>NAT</h3>
<div class="scroll"><table class="t"><tr><th>Type</th><th>Rewrites</th><th>Typical use</th></tr>
<tr><td>SNAT</td><td>The source, on the way out.</td><td>Private hosts sharing one public IP.</td></tr>
<tr><td>MASQUERADE</td><td>SNAT using whatever IP the outgoing interface has.</td><td>DHCP uplinks, home routers.</td></tr>
<tr><td>DNAT</td><td>The destination, on the way in.</td><td>Port forwarding, load balancers, Kubernetes Services.</td></tr>
<tr><td>1:1 NAT</td><td>One private IP mapped to one public IP.</td><td>A cloud VM interface with its own public IP, like an AWS Elastic IP.</td></tr></table></div>
<p>Only the <b>first packet</b> of a flow goes through the nat table. The rewrite is stored in conntrack and applied to the rest and to the replies. That is why NAT breaks when conntrack is full.</p>
<p><b>Port exhaustion:</b> SNAT shares one public IP by changing source ports. One destination IP and port can only see about 28,000 simultaneous source ports from one public IP. Symptom: new outbound connections fail, existing ones work. Fix: more public IPs in the pool, connection reuse, shorter timeouts.</p>
<h3>MTU, MSS and black holes</h3>
<div data-dg="encap"></div>
<ul><li><b>MTU:</b> the largest packet a link carries, usually 1500. <b>MSS = MTU − 40</b> (IP 20 + TCP 20), so 1460.</li>
<li><b>Path MTU discovery:</b> hosts set Don't Fragment. A router that can't forward a big packet drops it and sends ICMP type 3 code 4, <q>fragmentation needed</q>.</li>
<li><b>Black hole:</b> a firewall drops that ICMP. Small packets work, big ones vanish. SSH logs in, file copies hang.</li>
<li><b>Test:</b> <code>ping -M do -s 1472 host</code> (1472 + 28 = 1500). Step down until it works.</li>
<li><b>Fix:</b> lower the MTU, allow ICMP type 3 code 4, or clamp TCP MSS.</li></ul>
<div class="scroll"><table class="t"><tr><th>Encapsulation</th><th>Overhead</th><th>Inner MTU on 1500</th></tr>
<tr><td>VXLAN (UDP 4789)</td><td>50 bytes</td><td>1450</td></tr><tr><td>Geneve (UDP 6081)</td><td>50 plus options</td><td>1450 or less</td></tr>
<tr><td>GRE</td><td>24 bytes</td><td>1476</td></tr><tr><td>IPsec ESP, tunnel mode</td><td>about 50 to 73</td><td>about 1400 to be safe</td></tr></table></div>
<h3>Overlays</h3>
<p>A tenant's packet is wrapped inside an outer UDP packet so tenant networks can cross the physical network and reuse the same IP ranges. A 24-bit network ID keeps tenants apart. <span class="note">You rarely know how a company built theirs. Ask.</span></p>
<h3>Linux virtual networking</h3>
<p><b>Namespace:</b> a separate network stack with its own interfaces, routes, rules and conntrack. <b>veth pair:</b> a virtual cable. <b>Bridge:</b> a virtual switch in the kernel. <b>VLAN interface:</b> tags frames with 802.1Q.</p>
<h3>IPsec in plain words</h3>
<ul><li><b>IKE (UDP 500)</b> negotiates. <b>Phase 1</b> builds the IKE SA: the gateways authenticate each other and agree on encryption, integrity and a DH group. <b>Phase 2</b> builds the child SAs: keys and traffic selectors for real data.</li>
<li>Data rides in <b>ESP</b> (IP protocol 50). If NAT is detected, both sides move to <b>UDP 4500</b>.</li>
<li>Site-to-site uses <b>tunnel mode</b>: the whole original packet is encrypted inside a new one.</li></ul>
<div class="scroll"><table class="t"><tr><th>Error name</th><th>Means</th></tr>
<tr><td>NO_PROPOSAL_CHOSEN</td><td>Proposals don't match.</td></tr><tr><td>AUTHENTICATION_FAILED</td><td>Wrong key or ID.</td></tr>
<tr><td>TS_UNACCEPTABLE</td><td>Subnets don't match.</td></tr><tr><td>Retransmits, then timeout</td><td>UDP 500 or 4500 blocked, or the peer's IP changed.</td></tr></table></div>
<p><b>Tunnel up, no traffic:</b> routing on either side, a firewall on the inner subnets, overlapping subnets, or MTU. Tools: <code>swanctl --list-sas</code>, <code>ip xfrm state</code>, <code>ip xfrm policy</code>.</p>
<h3>BGP and IPv6, the short version</h3>
<p><b>BGP:</b> how networks exchange routes. Each is an autonomous system with an AS number. Peers talk over <b>TCP 179</b> and advertise prefixes. Healthy state is <b>Established</b>. Stuck in Idle or Active: reachability, wrong ASN, MD5, hold timer. <b>IPv6:</b> Neighbor Discovery over ICMPv6 replaces ARP. Never block ICMPv6 entirely. Routers don't fragment. A /64 is the standard subnet.</p>`,
 quiz:[
 {q:"SNAT vs DNAT.", o:["SNAT rewrites the source on the way out. DNAT rewrites the destination on the way in","SNAT is for TCP, DNAT is for UDP","SNAT is stateless, DNAT is stateful","SNAT encrypts, DNAT decrypts"], e:"SNAT in POSTROUTING, DNAT in PREROUTING. Both rely on conntrack to reverse the rewrite on replies."},
 {q:"Red (10.10.0.2) pings green (10.20.0.2) through a router doing MASQUERADE on its 10.20.0.1 side. What source does green see?", o:["10.20.0.1, the router","10.10.0.2, red","10.10.0.1","Green's own address"], e:"MASQUERADE is SNAT with the outgoing interface's IP. Green thinks the router is talking to it."},
 {q:"New outbound connections through a busy NAT gateway fail to one popular destination. Existing ones work.", o:["Source port exhaustion: add public IPs to the pool or reuse connections","The MTU is too small","DNS is caching a stale record","The destination is rate limiting ICMP"], e:"One destination IP and port can only see so many source ports from one public IP."},
 {q:"On a 1500-byte link, what is the TCP MSS?", o:["1460","1500","1472","1450"], e:"MSS = MTU - 40: 20 bytes of IP header and 20 of TCP."},
 {q:"VXLAN on a 1500-byte underlay. What inner MTU, and why?", o:["1450, because VXLAN adds 50 bytes of headers","1460, because of the TCP header","1500, VXLAN has no overhead","1400, because of encryption"], e:"Outer IP, UDP, VXLAN header and inner Ethernet come to 50 bytes."},
 {q:"Why ping -M do -s 1472 to test a 1500 MTU?", o:["1472 bytes of payload plus 28 bytes of IP and ICMP headers is 1500","1472 is the TCP MSS","28 bytes are reserved for VLAN tags","It isn't. You should use 1500"], e:"-M do sets Don't Fragment, so a too-big packet fails instead of being split."},
 {q:"What turns an MTU mismatch into a black hole?", o:["A firewall dropping ICMP \"fragmentation needed\" (type 3 code 4)","The sender clearing the DF bit","Jumbo frames on the underlay","A full conntrack table"], e:"Without that ICMP the sender never learns to shrink its packets."},
 {q:"IKE phase 1 vs phase 2.", o:["Phase 1 authenticates the gateways and builds the IKE SA. Phase 2 builds the child SAs that carry data","Phase 1 carries data, phase 2 rekeys","Phase 1 is UDP 4500, phase 2 is UDP 500","Phase 1 is for IPv4, phase 2 for IPv6"], e:"Phase 2 holds the data keys and traffic selectors: which subnets go through the tunnel."},
 {q:"The strongSwan log says TS_UNACCEPTABLE.", o:["The subnets (traffic selectors) on the two sides don't match","The pre-shared key is wrong","The encryption proposals don't match","UDP 500 is blocked"], e:"NO_PROPOSAL_CHOSEN is proposals. AUTHENTICATION_FAILED is the key or ID."},
 {q:"NAT is detected between two IPsec peers. What changes?", o:["ESP gets wrapped in UDP on port 4500","The tunnel switches to transport mode","IKE moves to TCP 179","Nothing. ESP passes NAT unchanged"], e:"NAT traversal: both sides move to UDP 4500."},
 {q:"BGP: which port, and what is the healthy session state?", o:["TCP 179, Established","UDP 500, INSTALLED","TCP 443, Active","UDP 4789, Idle"], e:"Stuck in Idle or Active means check reachability, ASN, MD5 and the hold timer."},
 {q:"What replaces ARP in IPv6?", o:["Neighbor Discovery, over ICMPv6","DHCPv6","Router Advertisement only","ARPv6"], e:"Which is why you never block ICMPv6 entirely."}
 ]},

{n:5, name:"The Balancer's Hall", sub:"Load balancing, health checks, persistence",
 intro:"Load balancing shows up in every networking and platform interview. Know L4 against L7 cold, and be able to debug a flapping backend.",
 lesson:`
<h3>L4 vs L7</h3>
<div data-dg="lb"></div>
<p><b>L4</b> forwards TCP or UDP connections by IP and port without reading the payload. Fast, any protocol. <b>L7</b> understands HTTP: route by host or path, terminate TLS, rewrite headers, insert cookies.</p>
<h3>Health checks</h3>
<p>The balancer probes each backend: a TCP connect (L4) or an HTTP request expecting a 200 (L7). After <b>N failures</b> it pulls the backend, after <b>M successes</b> it puts it back. Too aggressive and backends flap. Too slow and users hit dead servers.</p>
<p class="say">Backends flapping: the health check and the real traffic are seeing different things. I compare the interval, timeout and thresholds with the backend's response time, capture the check on both ends, and confirm the check's source IP is allowed and takes the same route as real traffic.</p>
<h3>The rest of the vocabulary</h3>
<ul><li><b>Algorithms:</b> round robin, least connections, weighted, source-IP hash.</li>
<li><b>Persistence:</b> by source IP or a cookie. It can break even distribution.</li>
<li><b>TLS offloading:</b> the balancer terminates TLS, saving backend CPU and centralising certificates. Backends see the <b>balancer's IP</b> unless you pass the client IP in <code>X-Forwarded-For</code> or with the PROXY protocol.</li>
<li><b>Direct server return:</b> replies skip the balancer. It breaks if the return path crosses a stateful device.</li>
<li><b>Global load balancing:</b> DNS-based steering to the healthiest or nearest site. TTLs control how fast failover takes effect.</li>
<li><b>Uneven load:</b> check the algorithm, stickiness, flapping, long-lived connections piling up, and a slow backend that least-connections avoids.</li></ul>
`,
 quiz:[
 {q:"L4 vs L7 load balancing.", o:["L4 balances on IP and port without reading the payload. L7 reads the HTTP request and can route on host, path or header","L4 is for HTTP, L7 is for TCP","L4 terminates TLS, L7 can't","L4 uses cookies, L7 uses source IP"], e:"L4 is faster and protocol-agnostic. L7 can terminate TLS and rewrite headers."},
 {q:"Behind an L7 proxy, the backend logs show the proxy's IP for every request. How do you get the client IP?", o:["Pass it in X-Forwarded-For or use the PROXY protocol","Enable direct server return on the backend","Turn off health checks","Use a longer DNS TTL"], e:"The proxy opens its own connection to the backend, so the source IP is the proxy's."},
 {q:"Backends keep flipping between up and down, but users are mostly fine.", o:["The health check and real traffic see different things: compare timeout and thresholds with the check's response time","The backend is certainly down","DNS TTL is too long","The algorithm is round robin"], e:"A slow health endpoint with a tight timeout flaps while real pages are fast."},
 {q:"Direct server return breaks when…", o:["The return path crosses a stateful device that never saw the request","The backend uses HTTP/2","The balancer uses round robin","TLS is terminated on the backend"], e:"Replies skip the balancer. A stateful hop sees a reply with no tracked SYN."},
 {q:"How does session persistence usually work?", o:["A source IP hash or a cookie","A longer TCP keepalive","A lower MTU","A dedicated VLAN per user"], e:"It keeps a user on the same backend, and it can skew load."},
 {q:"Global load balancing steers users between sites. What controls how fast failover takes effect?", o:["The DNS TTL","The TCP window size","The health check path","The BGP hold timer on the backend"], e:"It's DNS-based steering, so cached answers live until their TTL expires."},
 {q:"Health check thresholds are set very aggressively. What's the risk?", o:["Backends flap in and out on brief blips","Dead servers stay in rotation for minutes","TLS handshakes fail","Sessions lose persistence"], e:"Too aggressive flaps. Too slow sends users to dead servers."},
 {q:"With least-connections, one backend gets far less traffic than the others.", o:["It's probably slow, so its connections last longer and it's picked less","It has the highest weight","Its health check is disabled","It's on a different subnet"], e:"Also check stickiness, flapping, and long-lived connections piling up."}
 ]},

{n:6, name:"The Machine Room", sub:"Linux, Bash, Kafka, MySQL, containers, Kubernetes, HTTP and TLS",
 intro:"Linux and the tools around it. Every line on a resume can be asked here, and precise terms matter. This level has the most terminal work.",
 lesson:`
<h3>The slow-server order</h3>
<p>Impact and recent change first. Then find the saturated resource, then the process, then why. One change at a time.</p>
<div class="scroll"><table class="t"><tr><th>Command</th><th>Reading</th></tr>
<tr><td><code>uptime</code></td><td>Load versus core count (<code>nproc</code>).</td></tr>
<tr><td><code>top</code></td><td>CPU split: us, sy, <b>wa</b>. Top process. D state = uninterruptible I/O.</td></tr>
<tr><td><code>vmstat 1</code></td><td><b>r</b> run queue, <b>b</b> blocked, <b>si/so</b> swap in and out, <b>wa</b> iowait.</td></tr>
<tr><td><code>free -h</code></td><td>Low <i>free</i> is normal. Low <i>available</i> is a problem.</td></tr>
<tr><td><code>iostat -x 1</code></td><td>%util near 100 = saturated. await = latency in ms.</td></tr>
<tr><td><code>df -h</code>, <code>df -i</code></td><td>Space and inodes.</td></tr>
<tr><td><code>dmesg -T | tail</code></td><td>OOM kills, disk errors.</td></tr>
<tr><td><code>journalctl -xe</code>, <code>ss -tlnp</code></td><td>Service errors. What is listening.</td></tr></table></div>
<h3>The ones people fumble</h3>
<ul><li><b>Sticky bit:</b> a permission bit on a directory. Only the file's owner, the directory's owner or root can delete or rename files in it. <code>/tmp</code>, mode 1777, <code>drwxrwxrwt</code>. setuid runs a program as its owner (passwd). setgid on a directory makes new files inherit its group.</li>
<li><b>Deleting a file</b> needs write and execute on the <b>directory</b>, not write on the file.</li>
<li><b>Swap:</b> disk space the kernel uses for inactive pages when RAM is full. Disk is thousands of times slower than RAM. Used swap alone isn't the problem. <b>Active</b> swapping (si and so) is. If both run out, the OOM killer ends a process: <code>dmesg</code>. In a container: OOMKilled, exit 137.</li>
<li><b>Load high, CPU idle:</b> load counts tasks waiting on I/O too.</li>
<li><b>df full, du not:</b> a deleted file is held open (<code>lsof +L1</code>), or out of inodes (<code>df -i</code>).</li></ul>
<h3>Processes and services</h3>
<p>fork copies a process, exec replaces its image. PID 1 is systemd and adopts orphans. A zombie has exited but its parent hasn't collected its status. <b>SIGTERM</b> (15) asks and can be caught, <b>SIGKILL</b> (9) can't. A service won't start: <code>systemctl status</code>, <code>journalctl -u name -b</code>, test the config, <code>ss -tlnp</code> for the port, permissions, SELinux (<code>getenforce</code>, <code>ausearch -m avc</code>), then what changed. Never just disable SELinux: <code>restorecon -Rv</code>.</p>
<h3>Kafka, MySQL, split-brain</h3>
<ul><li><b>Kafka:</b> a distributed log for streaming events. Producers append to topics, consumers read at their own pace using offsets. Topics split into partitions, and a consumer group divides them. <b>Lag</b> = log end offset minus the consumer's offset.</li>
<li><b>Replication:</b> the primary writes changes to its binary log, replicas replay them. <code>SHOW REPLICA STATUS</code>: both threads running, Seconds_Behind_Source, last error.</li>
<li><b>Split-brain:</b> both nodes believe they are primary and accept writes. Pick the true primary, demote the other, resync it. Prevent with quorum, a witness or fencing.</li></ul>
<h3>Containers and Kubernetes</h3>
<p>A container shares the host kernel, isolated by namespaces and limited by cgroups. A VM runs its own kernel. Exit 137 = SIGKILL, often OOM.</p>
<div class="scroll"><table class="t"><tr><th>You see</th><th>Do, and usual causes</th></tr>
<tr><td>Pending</td><td><code>describe pod</code>, read Events. Not enough resources, taints or selectors, unbound volume claim.</td></tr>
<tr><td>CrashLoopBackOff</td><td><code>logs --previous</code>, <code>describe</code> for the exit code. Bad config, missing secret, failing liveness probe, OOMKilled.</td></tr>
<tr><td>ImagePullBackOff</td><td>Wrong name or tag, missing registry credentials.</td></tr>
<tr><td>Service has no traffic</td><td><code>get endpoints</code>. Empty = selector doesn't match labels, or pods not Ready. Then port vs targetPort.</td></tr>
<tr><td>Node NotReady</td><td><code>describe node</code>, kubelet journal. Disk pressure, expired certificates.</td></tr></table></div>
<p>A Deployment declares desired state: a pod template and a replica count. Readiness controls traffic, liveness restarts. <code>kubectl rollout undo</code> reverses. k3s certificates expire after about a year: x509 errors, fixed by rotating or restarting k3s.</p>
<h3>HTTP and TLS</h3>
<p><b>401</b>: the server doesn't know who you are. <b>403</b>: it knows and says no. 502: the proxy got a bad answer from the upstream. 503: no healthy backend or overload. 504: the upstream took too long. Certificate problems: <code>openssl s_client -connect host:443 -servername host</code>. Expired, missing intermediate, name mismatch, wrong clock.</p>`,
 quiz:[
 {q:"What is the sticky bit?", o:["A bit on a directory: only the file's owner, the directory's owner or root can delete or rename files in it","A bit that makes a program run as its owner","A bit that keeps a file in memory","A bit that makes new files inherit the directory's group"], e:"/tmp is the classic case, mode 1777. Running as owner is setuid. Group inheritance is setgid on a directory."},
 {q:"A user can read a file but can't delete it. Most likely?", o:["They lack write and execute on the directory, or the directory is sticky","The file is too large","The file lacks the execute bit","The file is owned by root, so nobody can delete it"], e:"Deleting changes the directory, not the file. Also check lsattr for an immutable flag."},
 {q:"Which vmstat columns tell you a host is swapping right now?", o:["si and so","us and sy","r and b","bi and bo"], e:"Used swap alone isn't the problem. Active swap-in and swap-out is."},
 {q:"Load average 20 on 4 cores, CPU mostly idle.", o:["Tasks are waiting on I/O: check wa, the b column, iostat and D-state processes","A CPU-bound loop","The load average is broken","Too many zombie processes"], e:"Load counts tasks in uninterruptible I/O wait, not only tasks wanting CPU."},
 {q:"df says the disk is 100 percent full. du adds up to far less. First command?", o:["lsof +L1","rm -rf /tmp/*","fsck","reboot"], e:"A deleted file still held open by a process. Also df -i for inodes."},
 {q:"What is Kafka consumer lag?", o:["The log end offset minus the consumer's committed offset","The time a broker takes to replicate","The number of partitions without a leader","The delay before a producer retries"], e:"Growing lag means the consumer is slow or stuck. Alert on it, not just on the service being up."},
 {q:"Split-brain recovery, in order:", o:["Stop writes, pick the node with correct data, demote and resync the other, fix the cause","Restart both nodes and let them elect","Promote both and merge later","Restore from last night's backup"], e:"Prevent a repeat with quorum, a witness node or fencing."},
 {q:"A container exits with code 137.", o:["It was killed with SIGKILL, often for exceeding its memory limit","The image was not found","The application returned a config error","It exited cleanly"], e:"137 = 128 + 9. docker inspect shows OOMKilled."},
 {q:"A pod is in CrashLoopBackOff. Most useful first command?", o:["kubectl logs --previous","kubectl get nodes","kubectl delete pod","kubectl get endpoints"], e:"It shows the output of the run that just died. describe gives the exit code."},
 {q:"Pods are Running, the Service doesn't respond.", o:["kubectl get endpoints: empty means the selector doesn't match the pod labels or pods aren't Ready","Restart kube-proxy","Scale the Deployment up","Delete and recreate the namespace"], e:"The path is client, Service IP, kube-proxy rules, pod IP."},
 {q:"401 vs 403.", o:["401: the server doesn't know who you are. 403: it knows, and says no","401: forbidden. 403: unauthenticated","Both mean the same thing","401 is a server error, 403 is a client error"], e:"401 is missing or bad credentials. 403 is authenticated but not allowed."},
 {q:"502 vs 504 from a reverse proxy.", o:["502: the proxy got a bad answer from the upstream. 504: the upstream took too long","502: timeout. 504: bad answer","502: the client sent a bad request. 504: not found","They're interchangeable"], e:"For both, read the proxy log and check upstream health."},
 {q:"SIGTERM vs SIGKILL.", o:["SIGTERM asks the process to exit and can be caught. SIGKILL cannot be caught","SIGTERM is signal 9","SIGKILL lets the process clean up first","SIGTERM only works on root processes"], e:"TERM is 15, KILL is 9. Try TERM first."},
 {q:"nginx returns 403. File permissions are correct, SELinux is Enforcing. Right fix?", o:["Find the denial with ausearch -m avc and fix the label with restorecon","setenforce 0","chmod 777 the content","Reinstall nginx"], e:"Moved files keep their old context. Don't just disable SELinux."}
 ]},

{n:7, name:"The Watchtower", sub:"Rollouts, SLOs, Prometheus, automation, incidents",
 intro:"The operating side of SRE: phased rollouts, SLOs, Prometheus, alerting, runbooks and automation.",
 lesson:`
<h3>Safe rollouts</h3>
<div data-dg="rollout"></div>
<ul><li><b>Phases:</b> one host, a canary group, one region, the rest. Each has <b>bake time</b>.</li>
<li><b>Health gates:</b> compare new against old on probe success, packet drops, conntrack use, control plane errors. A failed gate stops the rollout by itself.</li>
<li><b>Feature flags:</b> ship the code dark, turn it on for a small share. The flag is the fastest rollback.</li>
<li><b>Rollback:</b> keep the previous binary ready and test rolling back before you need it.</li>
<li><b>Blast radius:</b> decide up front how many customers one bad step can touch.</li></ul>
<p class="say">I deploy to one host and run a validation suite, then a small canary group in one region with an hour of bake time. I compare drops, probe success and conntrack against hosts on the old version. Then I widen region by region with the same gates, and any regression stops the rollout automatically. To roll back, flag first, binary second. Then add one small real example of your own.</p>
<h3>SLOs and error budgets</h3>
<p><b>SLI</b> is the measurement. <b>SLO</b> is the target. <b>SLA</b> is the promise. Error budget is 1 minus the SLO.</p>
<div data-dg="budget"></div>
<p><b>30 days = 43,200 minutes.</b> Memorise that and the rest is multiplication. Burn rate 1 spends the budget in exactly 30 days. Burning at 14.4 for one hour spends 2 percent: a common paging threshold. Budget nearly spent: freeze risky rollouts, do reliability work.</p>
<p>Good SLIs for a network product: probe success inside VPCs, firewall rule propagation time (API call to enforced on the host), tunnel uptime, control plane API latency and errors.</p>
<h3>Prometheus</h3>
<ul><li><b>Pull model:</b> it scrapes <code>/metrics</code> from each target every 15 seconds. <code>up == 0</code> means the scrape failed. That isn't proof the host is down.</li>
<li><b>Counter</b> only goes up: <code>rate()</code>. <b>Gauge</b> goes up and down. <b>Histogram</b>: <code>histogram_quantile()</code>.</li>
<li><b>blackbox_exporter</b> probes from outside. node_exporter says the host is healthy. Blackbox says what a user sees.</li>
<li><b>for:</b> the condition must hold that long before firing. Pending, then firing. Fewer false pages.</li>
<li>Alert on <b>symptoms users feel</b>. Golden signals: latency, traffic, errors, saturation. Every page links to a runbook.</li>
<li><b>Loki</b> indexes labels, not log text. Keep labels low-cardinality.</li></ul>
<pre class="code">rate(node_network_receive_drop_total[5m])
sum(rate(http_requests_total{code=~"5.."}[1m])) / sum(rate(http_requests_total[1m]))
histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket[1m])))
avg_over_time(probe_success[1h])</pre>
<h3>SaltStack, Ansible, CI/CD</h3>
<p>Salt: a master and minions holding a connection over ZeroMQ (4505, 4506). <b>States</b> are roles, <b>grains</b> are facts, <b>pillar</b> is vars and Vault. <code>salt -b 10% '*' state.apply</code> is a rolling change. <code>test=True</code> is the dry run. Ansible is agentless over SSH and idempotent: run twice, same result. CI builds and tests every change. CD moves it through stages with gates. Jenkinsfile and .gitlab-ci.yml are the same idea.</p>
<h3>Incidents</h3>
<p><b>Mitigate first,</b> then root cause. Rolling back is mitigation. Communicate on a fixed cadence even with no news: what we know, what we're doing, when the next update comes. Blameless postmortem: timeline, impact, root cause, what went well, what didn't, action items with owners. A <b>Technical Readiness Review</b> is the launch checklist: monitoring, alerts, runbook, tested rollback, capacity, on-call knows.</p>`,
 quiz:[
 {q:"Error budget for a 99.9 percent SLO over 30 days?", o:["43.2 minutes","4.3 minutes","7.2 hours","21.6 minutes"], e:"43,200 minutes x 0.001."},
 {q:"And for 99.99 percent?", o:["About 4.3 minutes","43.2 minutes","About 26 seconds","21.6 minutes"], e:"43,200 x 0.0001 = 4.32."},
 {q:"In Prometheus, up == 0 means…", o:["The scrape failed. The exporter is unreachable, which isn't proof the host is down","The host is powered off","The service returned HTTP 500","Alertmanager is down"], e:"A firewall drop on the exporter port looks exactly the same."},
 {q:"Why run blackbox probes when you already have node_exporter?", o:["node_exporter says the host is healthy. A probe says what a user sees","Blackbox uses less memory","node_exporter can't measure CPU","Probes replace the need for alerts"], e:"When nginx was stopped in the lab, the host stayed green and only the probe caught it."},
 {q:"What does for: 1m do in an alert rule?", o:["The condition must stay true for a minute before the alert fires. Until then it's pending","It delays the scrape by a minute","It repeats the notification every minute","It silences the alert for a minute"], e:"It trades a little detection time for fewer false pages."},
 {q:"How do you query a counter such as node_network_receive_drop_total?", o:["With rate(), because a counter only goes up","Directly, its value is the current rate","With histogram_quantile()","With avg_over_time() only"], e:"rate(metric[5m]) gives per-second change."},
 {q:"The rollout order for a new dataplane binary:", o:["One host, canary group, one region, the rest, with bake time and gates between","One region, then all hosts","All hosts at night, then verify","Canary group, then everything at once"], e:"Any regression stops it automatically."},
 {q:"What's the fastest rollback?", o:["Turning the feature flag off","Reverting the binary on every host","Restoring from backup","Rebooting the canary hosts"], e:"Flags separate deploying code from turning it on. Flag first, binary second."},
 {q:"In Salt, what are grains, and what does salt -b 10% do?", o:["Grains are facts about a minion. -b 10% applies to 10 percent of hosts at a time","Grains are secrets. -b 10% limits CPU","Grains are states. -b 10% is a dry run","Grains are targets. -b 10% picks a random host"], e:"Pillar holds per-minion data and secrets. test=True is the dry run."},
 {q:"An incident is live. First priority?", o:["Mitigate. Rolling back counts","Find the root cause","Write the postmortem","Identify who made the change"], e:"Restore service, then investigate in a calm state. Update on a fixed cadence."},
 {q:"Burn rate 14.4 for one hour spends how much of a 30-day budget?", o:["2 percent","14.4 percent","50 percent","0.1 percent"], e:"14.4 / 720 hours = 0.02. A common threshold for paging."},
 {q:"Idempotent means…", o:["Running the same task twice leaves the same result as running it once","The task runs on every host in parallel","The task can't fail","The task needs no credentials"], e:"Ansible modules check current state and change only what differs."},
 {q:"SLI, SLO, SLA.", o:["The measurement, the target, the promise","The promise, the measurement, the target","The target, the promise, the measurement","Three names for the same thing"], e:"The error budget is 1 minus the SLO."}
 ]},

{n:8, name:"The Interview", sub:"Stories, your questions, the mock, the cheat sheet",
 intro:"The last hop is the conversation itself: your questions for them, the cards about you, and a timed mock. This is where you practise going in on your own.",
 lesson:"", quiz:[
 {q:"How long is each story?", o:["60 to 90 seconds: situation, what you checked, what you found, the fix, the lesson","Five minutes, with full context","Two sentences","As long as they let you talk"], e:"Say each three times. Under 90 seconds."},
 {q:"You can't remember how one of your incident stories ended.", o:["Tell it up to the point you remember and say plainly you don't recall the final fix","Invent a plausible ending","Skip the story entirely","Say the customer never replied"], e:"Never invent an ending. The method is the point of the story."},
 {q:"A resume line sounds bigger than the work was.", o:["Say the real size out loud. \"Small playbooks for two clients\" is a strong answer","Defend the line as written","Change the subject","Say you can't discuss client work"], e:"A big claim that falls apart under one follow-up is worse than a modest true one."},
 {q:"You're asked for your salary range.", o:["Give the same range as before, flexible depending on the full package, then stop talking","Ask what the band is first and refuse to answer","Say you'll take anything","Raise it yourself early so it's out of the way"], e:"Skip pay unless they raise it. If they do, give the same range as before."},
 {q:"How do you close?", o:["\"Thank you. I enjoyed this. What are the next steps?\"","\"Sorry if I rambled.\"","\"I hope I did okay.\"","\"Let me know if I got anything wrong.\""], e:"No apology at the end either."},
 {q:"How many questions do you ask the interviewer, and how?", o:["Three, reacting to each answer in one sentence before the next","As many as time allows, back to back","One, to save their time","None. Questions look unprepared"], e:"Keep it tight and listen."}
 ]}
];
