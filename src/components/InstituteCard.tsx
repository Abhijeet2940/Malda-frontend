import React from "react";
import { useNavigate } from "react-router-dom";

interface InstituteCardProps {
  name: string;
  description: string;
  highlighted?: boolean;
  image?: string;
  onViewDetails?: () => void;
}

export const InstituteCard: React.FC<InstituteCardProps> = ({
  name,
  description,
  highlighted,
  image,
  onViewDetails,
}) => {
  const navigate = useNavigate();
  
  return (
    <article className={`institute-card ${highlighted ? "highlighted" : ""}`}>
      {image && (
        <div className="institute-card-image">
          <img src={image} alt={name} />
        </div>
      )}
      <div className="institute-card-content">
        <h3>{name}</h3>
        <p>{description}</p>
        <div className="card-actions">
          <button className="primary-button" onClick={() => navigate("/booking")}>Book Now</button>
          <button className="secondary-button" onClick={onViewDetails}>View Details</button>
        </div>
      </div>
    </article>
  );
};

