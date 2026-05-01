import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { institutes } from "../data/institutes";
import hallMRI from "../Assets/hallMRI.jpeg";
import decorationHall from "../Assets/decorationHall.jpeg";
import marriageAuditorium from "../Assets/marriage-audotorium.jpeg";
import mriFront from "../Assets/mriFront.jpeg";
import sahebganjFront from "../Assets/sahebganj-front.jpeg";
import sahebganjStage from "../Assets/sahebganj-stage.jpeg";
import sahebganjaudotrium from "../Assets/sahebganj-audotorium.jpeg";
import sahebganjInstitute from "../Assets/sahebangRailwayInstitute.jpeg";
import BhagalpurAuditorium from "../Assets/Bhagalpur-Audotorium.jpeg";
import BhagalpurFront from "../Assets/Bhagalpur-front.jpeg";
import BhagalpurStage from "../Assets/bhagalpurStage.jpeg";
import BhagalpurMain from "../Assets/Bhagalpur-main.jpeg";



const institutePhotos: Record<string, { label: string; src?: string; color: string }[]> = {
  malda: [
    { label: "Hall Interior", src: hallMRI, color: "linear-gradient(135deg,#bfdbfe,#93c5fd)" },
    { label: "Marriage Auditorium", src: marriageAuditorium, color: "linear-gradient(135deg,#bbf7d0,#6ee7b7)" },
    { label: "Institute Front", src: mriFront, color: "linear-gradient(135deg,#fde68a,#fcd34d)" },
    { label: "Decoration Hall", src: decorationHall, color: "linear-gradient(135deg,#a5f3fc,#67e8f9)" },
  ],
  sahibganj: [
    { label: "Institute Front", src: sahebganjFront, color: "linear-gradient(135deg,#fecaca,#fca5a5)" },
    { label: "Auditorium Front", src: sahebganjaudotrium, color: "linear-gradient(135deg,#fde68a,#fcd34d)" },
    { label: "Stage Setup", src: sahebganjStage, color: "linear-gradient(135deg,#fed7aa,#fdba74)" },
    { label: "Railway Institute", src: sahebganjInstitute, color: "linear-gradient(135deg,#bbf7d0,#6ee7b7)" },
  ],
  bhagalpur: [
    { label: "Auditorium Front", src: BhagalpurAuditorium, color: "linear-gradient(135deg,#fde68a,#fcd34d)" },
    { label: "Institute Front", src: BhagalpurMain, color: "linear-gradient(135deg,#fca5a5,#f87171)" },
    { label: "Stage Setup", src: BhagalpurStage ,color: "linear-gradient(135deg,#bfdbfe,#93c5fd)" },
    { label: "Award Function", src: BhagalpurFront, color: "linear-gradient(135deg,#fecaca,#fca5a5)" },
  ],  
};

const VISIBLE = 3;

const InstituteGallery: React.FC<{ id: string; name: string }> = ({
  id,
  name,
}) => {
  const [start, setStart] = useState(0);
  const navigate = useNavigate();
  const photos = institutePhotos[id] ?? [];
  const total = photos.length;

  const prev = () => setStart((s) => Math.max(0, s - 1));
  const next = () => setStart((s) => Math.min(total - VISIBLE, s + 1));

  const visible = photos.slice(start, start + VISIBLE);

  return (
    <div className="gallery-institute-block">
      <h3 className="gallery-institute-name">{name}</h3>

      <div className="gallery-carousel">
        <button
          className="carousel-arrow carousel-arrow-left"
          onClick={prev}
          disabled={start === 0}
        >
          &#8249;
        </button>

        <div className="carousel-track">
          {visible.map((photo, i) => (
            <div
              key={start + i}
              className="carousel-slide"
              style={{ background: photo.src ? undefined : photo.color }}
            >
              {photo.src
                ? <img src={photo.src} alt={photo.label} className="carousel-img" />
                : <span className="carousel-label">{photo.label}</span>
              }
            </div>
          ))}
        </div>

        <button
          className="carousel-arrow carousel-arrow-right"
          onClick={next}
          disabled={start >= total - VISIBLE}
        >
          &#8250;
        </button>
      </div>

      <div className="carousel-dots">
        {Array.from({ length: total - VISIBLE + 1 }).map((_, i) => (
          <button
            key={i}
            className={`carousel-dot ${i === start ? "active" : ""}`}
            onClick={() => setStart(i)}
          />
        ))}
      </div>

      <div className="gallery-card-actions">
        <button className="primary-button" onClick={() => navigate("/booking")}>Book Now</button>
        <button
          className="secondary-button"
          onClick={() => navigate(`/institute/${id}`)}
        >
          View Details
        </button>
      </div>
    </div>
  );
};

export const GallerySection: React.FC = () => {
  return (
    <section className="page-section">
      <div className="container">
        <p className="eyebrow">Gallery</p>
        <h2>Institute Photo Gallery</h2>
        <p className="page-lead">
          Explore highlights from each institute — cultural events, facilities,
          and community life.
        </p>
        <div className="gallery-institutes-list">
          {institutes.map((inst) => (
            <InstituteGallery key={inst.id} id={inst.id} name={inst.name} />
          ))}
        </div>
      </div>
    </section>
  );
};

