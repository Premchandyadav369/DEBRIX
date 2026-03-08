import { motion } from "framer-motion";
import { User } from "lucide-react";

const team = [
  { name: "Team Lead", role: "Project Manager", spec: "Systems Engineering" },
  { name: "Engineer A", role: "Satellite Design", spec: "Mechanical Engineering" },
  { name: "Engineer B", role: "AI & Algorithms", spec: "Computer Science" },
  { name: "Engineer C", role: "Orbital Mechanics", spec: "Aerospace Engineering" },
  { name: "Engineer D", role: "Communications", spec: "Electrical Engineering" },
  { name: "Project Guide", role: "Faculty Advisor", spec: "Space Science" },
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
