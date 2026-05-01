import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getInstituteById, institutes } from "../data/institutes";
import mriFront from "../Assets/mriFront.jpeg";
import stageMRI from "../Assets/stageMRI.jpeg";
import hallMRI from "../Assets/hallMRI.jpeg";
import decorationHall from "../Assets/decorationHall.jpeg";
import marriageAuditorium from "../Assets/marriage-audotorium.jpeg";
import stageMRI2 from "../Assets/stageMRI2.jpeg";
import sahebganjFront from "../Assets/sahebganj-front.jpeg";
import sahebganjStage from "../Assets/sahebganj-stage.jpeg";
import sahebganjInstitute from "../Assets/sahebangRailwayInstitute.jpeg";
import BhagalpurAuditorium from "../Assets/Bhagalpur-Audotorium.jpeg";
import BhagalpurHall from "../Assets/Bhagalpur-hall.jpeg";
import BhagalpurStage from "../Assets/bhagalpurStage.jpeg";
import BhagalpurMain from "../Assets/Bhagalpur-main.jpeg";

const maldaImages = [
  { src: mriFront, alt: "Institute Front" },
  { src: decorationHall, alt: "Decoration Hall" },
  { src: hallMRI, alt: "Hall Interior" },
  { src: marriageAuditorium, alt: "Marriage Auditorium" },
];

const sahibganjImages = [
  { src: sahebganjFront, alt: "Sahibganj Institute Front" },
  { src: sahebganjStage, alt: "Sahibganj Stage Setup" },
  { src: sahebganjInstitute, alt: "Sahibganj Railway Institute" },
];

const BhagalpurImages = [
  { src: BhagalpurAuditorium, alt: "Institute Front" },
  { src: BhagalpurHall, alt: "Hall Interior" },
  { src: BhagalpurStage, alt: "Stage Setup" },
  { src: BhagalpurMain, alt: "Main Building" },
];


const instituteImageMap: Record<string, typeof maldaImages> = {
  malda: maldaImages,
  sahibganj: sahibganjImages,
  bhagalpur: BhagalpurImages,
};

export const InstituteDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const institute = id ? getInstituteById(id) : null;
  const [carouselIndex, setCarouselIndex] = useState(0);

  if (!institute) {
    return (
      <div className="container" style={{ padding: "60px 20px" }}>
        <h2>Institute Not Found</h2>
        <p>The institute you're looking for doesn't exist.</p>
        <button onClick={() => navigate("/")} className="primary-button">
          Back to Home
        </button>
      </div>
    );
  }

  const currentIndex = institutes.findIndex((inst) => inst.id === id);
  const previousInstitute = currentIndex > 0 ? institutes[currentIndex - 1] : null;
  const nextInstitute = currentIndex < institutes.length - 1 ? institutes[currentIndex + 1] : null;

  return (
    <section className="institute-detail">
      <div className="container">
        <button
          onClick={() => navigate("/")}
          className="secondary-button back-button"
          style={{ marginBottom: "20px" }}
        >
          ← Back to Home
        </button>

        <article className="detail-content">
          {id && instituteImageMap[id] && (
            <div className="detail-carousel">
              <div className="detail-carousel-track">
                {instituteImageMap[id].map((img, i) => (
                  <img
                    key={i}
                    src={img.src}
                    alt={img.alt}
                    className={`detail-carousel-img${i === carouselIndex ? " active" : ""}`}
                  />
                ))}
              </div>
              <button
                className="detail-carousel-arrow left"
                onClick={() => setCarouselIndex((c) => (c - 1 + instituteImageMap[id!].length) % instituteImageMap[id!].length)}
              >&#8249;</button>
              <button
                className="detail-carousel-arrow right"
                onClick={() => setCarouselIndex((c) => (c + 1) % instituteImageMap[id!].length)}
              >&#8250;</button>
              <div className="detail-carousel-dots">
                {instituteImageMap[id].map((_, i) => (
                  <button
                    key={i}
                    className={`detail-carousel-dot${i === carouselIndex ? " active" : ""}`}
                    onClick={() => setCarouselIndex(i)}
                  />
                ))}
              </div>
            </div>
          )}

          <h1>{institute.name}</h1>

          <div className="institute-meta">
            <span>
              <strong>Location:</strong> {institute.location}
            </span>
          </div>

          <div className="main-content">
            <div className="left-column">
              <div className="detail-section">
                <h2>About {institute.name}</h2>
                <p>{institute.fullDescription}</p>
              </div>

              <div className="detail-section">
                <h2>Spaces & Facilities Offered</h2>
                <ul className="facilities-list">
                  {institute.facilities.map((facility) => (
                    <li key={facility}>{facility}</li>
                  ))}
                </ul>
              </div>

              <div className="detail-section detail-contact-card">
                <h2>Contact Details</h2>
                <p><strong>Name:</strong> {institute.contact.name}</p>
                <p><strong>Phone:</strong> {institute.contact.phone}</p>
                <p><strong>Address:</strong> {institute.contact.address}</p>
                <p><strong>Email:</strong> {institute.contact.email}</p>
              </div>


              <div className="detail-section contact-two-col-card">
                <div className="contact-two-col-side">
                  <h2>Welfare Inspector</h2>
                  <p><strong>Name:</strong> {institute.welfareInspector.name}</p>
                  <p><strong>Email:</strong> {institute.welfareInspector.email}</p>
                </div>
                <div className="contact-two-col-divider" />
                <div className="contact-two-col-side">
                  <h2>Office Superintendent</h2>
                  <p><strong>Name:</strong> {institute.secretary.name}</p>
                  <p><strong>Phone:</strong> {institute.secretary.phone}</p>
                </div>
              </div>
              <div className="detail-section detail-booking-card">
                <h2>Institute Booking Made Easy</h2>
                <p>Reserve this Eastern Railway Institute for official functions, cultural events, or private gatherings through our streamlined booking system.</p>
                <button className="primary-button" onClick={() => navigate("/booking")}>Book Now</button>
              </div>
            </div>

            <div className="right-column">
              <div className="detail-section terms-card">
                <h2>Terms & Conditions</h2>
                <ul className="terms-list">
                  {institute.terms.map((term, index) => (
                    <li key={index}>{term}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

        </article>

        <div className="institute-navigation">
          {previousInstitute && (
            <button
              onClick={() => navigate(`/institute/${previousInstitute.id}`)}
              className="nav-button prev-button"
            >
              ← {previousInstitute.name}
            </button>
          )}
          {nextInstitute && (
            <button
              onClick={() => navigate(`/institute/${nextInstitute.id}`)}
              className="nav-button next-button"
            >
              {nextInstitute.name} →
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
