import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { institutes } from "../data/institutes";

export const InstituteDropdown: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string>(institutes[0].id);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedId(id);
    navigate(`/institute/${id}`);
  };

  return (
    <section id="institutes" className="institutes-dropdown-section">
      <div className="container">
        <p className="eyebrow">Howrah Division Institutes</p>
        <h2>Select an Institute</h2>
        
        <div className="dropdown-container">
          <select
            value={selectedId}
            onChange={handleChange}
            className="institute-dropdown"
          >
            {institutes.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
};
