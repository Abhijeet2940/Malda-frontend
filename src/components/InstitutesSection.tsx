import React from "react";
import { useNavigate } from "react-router-dom";
import { institutes } from "../data/institutes";
import { InstituteCard } from "./InstituteCard";

const InstitutesSection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="institutes-section">
      <div className="container">
        <h2>Malda Division Railway Institutes</h2>
        <div className="institutes-grid">
        {institutes.map((institute) => (
          <InstituteCard
            key={institute.id}
            name={institute.name}
            description={institute.description}
            highlighted={institute.highlighted}
            image={institute.images?.[0]}
            onViewDetails={() => navigate(`/institute/${institute.id}`)}
          />
        ))}
        </div>
      </div>
    </section>
  );
};

export { InstitutesSection };