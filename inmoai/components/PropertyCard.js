
export default function PropertyCard({ property }) {
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <h3>{property.title}</h3>
      <p><b>Zona:</b> {property.location}</p>
      <p><b>Precio:</b> {property.price}</p>
      {property.image && <img src={property.image} alt="propiedad" style={{ maxWidth: '100%', borderRadius: 4 }} />}
      <div style={{ marginTop: 8 }}>
        <a href={property.link} target="_blank" rel="noopener noreferrer">Ver publicación original</a>
      </div>
    </div>
  );
}
