import { motion } from "framer-motion";
import { GraduationCap, ExternalLink, Linkedin, Github } from "lucide-react";

const team = [
  {
    name: "V C Premchand Yadav",
    role: "Team Lead",
    spec: "CSE (AI & ML)",
    linkedin: "https://www.linkedin.com/in/v-c-premchand-yadav-a785691a2/",
    github: "https://github.com/Premchandyadav369",
    initials: "PY",
  },
  {
    name: "Edupulapati Sai Praneeth",
    role: "AI Engineer",
    spec: "CSE (AI & ML)",
    linkedin: "https://www.linkedin.com/in/edupulapatisaipraneeth/",
    github: "https://github.com/SaiPraneeth-E",
    initials: "SP",
  },
  {
    name: "Yamala Liel Stephen",
    role: "Full Stack Developer",
    spec: "CSE (AI & ML)",
    linkedin: "https://www.linkedin.com/in/liel-stephen-17a06b295/",
    github: "https://github.com/LielStephen",
    initials: "LS",
  },
  {
    name: "Sri Harsha Vardhan K",
    role: "3D Architect & Designer",
    spec: "CSE (AI & ML)",
    linkedin: "https://www.linkedin.com/in/kurapati-sri-harshavardhan-025263290/",
    github: "https://github.com/MrAlhm-harsha",
    initials: "HV",
  },
  {
    name: "Sai Krishnan Iyer",
    role: "Orbital Mechanics & Simulation",
    spec: "Computer Science & Engineering",
    linkedin: "https://www.linkedin.com/in/sai-krishnan-iyer-b14570289/",
    github: "",
    initials: "SI",
  },
  {
    name: "Chinna Reddy Gari Mohith",
    role: "Software Engineering",
    spec: "Integrated M.Tech (Software Engineering)",
    linkedin: "https://www.linkedin.com/in/mohith-reddy-cr-87a585292/",
    github: "https://github.com/mohithreddy2810-ops",
    initials: "MR",
  },
];

const guide = {
  name: "Dr. Subbaiah Muthu Prabhu",
  role: "Faculty Advisor",
  links: [
    { label: "Google Scholar", url: "https://scholar.google.com/citations?user=D3A13LgAAAAJ&hl=en" },
    { label: "LinkedIn", url: "https://www.linkedin.com/in/subbaiah-muthu-prabhu-a10762ba" },
  ],
};

const TeamSection = () => {
  return (
    <section id="team" className="relative z-10">
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">The Crew</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Our Team</h2>
        </motion.div>

        {/* Guide card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card p-6 text-center max-w-md mx-auto mb-10 border-primary/30"
        >
          <p className="font-display text-xs tracking-[0.3em] text-muted-foreground mb-4 uppercase">Under the Guidance of</p>
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-7 h-7 text-primary" />
          </div>
          <h3 className="font-display font-semibold text-sm">{guide.name}</h3>
          <p className="text-primary text-xs font-display mt-1">{guide.role}</p>
          <div className="flex items-center justify-center gap-4 mt-3">
            {guide.links.map((link) => (
              <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors text-xs">
                <ExternalLink className="w-3 h-3" /> {link.label}
              </a>
            ))}
          </div>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {team.map((member, i) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="glass-card p-6 text-center group hover:border-primary/40 transition-all"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center mx-auto mb-4 group-hover:from-primary/40 group-hover:to-accent/40 transition-all border border-primary/20">
                <span className="font-display font-bold text-lg text-primary">{member.initials}</span>
              </div>
              <h3 className="font-display font-semibold text-sm">{member.name}</h3>
              <p className="text-primary text-xs font-display mt-1">{member.role}</p>
              <p className="text-muted-foreground text-xs mt-1">{member.spec}</p>
              <a
                href={member.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 text-muted-foreground hover:text-primary transition-colors text-xs"
              >
                <Linkedin className="w-3.5 h-3.5" /> LinkedIn
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TeamSection;
