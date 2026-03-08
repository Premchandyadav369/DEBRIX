import { motion } from "framer-motion";
import { User } from "lucide-react";

const team = [
  { name: "V C Premchand Yadav", role: "Team Lead", spec: "CSE (AI & ML)" },
  { name: "Yamala Liel Stephen", role: "AI & Algorithms", spec: "CSE (AI & ML)" },
  { name: "Sai Krishnan Iyer", role: "Satellite Systems", spec: "Computer Science & Engineering" },
  { name: "Sri Harsha Vardhan K", role: "Orbital Mechanics", spec: "CSE (AI & ML)" },
  { name: "Edupulapati Sai Praneeth", role: "Communications & Sensors", spec: "CSE (AI & ML)" },
  { name: "Chinna Reddy Gari Mohith", role: "Software Engineering", spec: "Integrated M.Tech (Software Engineering)" },
];

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
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                <User className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-sm">{member.name}</h3>
              <p className="text-primary text-xs font-display mt-1">{member.role}</p>
              <p className="text-muted-foreground text-xs mt-1">{member.spec}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TeamSection;
