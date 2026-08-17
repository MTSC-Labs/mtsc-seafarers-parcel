export default function TermsPage() {
  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <h1 className="page-title">Terms & Conditions</h1>
      <p className="page-subtitle">Consent Agreement for Parcel Pickup Service</p>

      <div className="card" style={{ padding: 32, lineHeight: 1.7, fontSize: 15, color: '#334155' }}>
        <h2 style={h2}>1. Service Purpose</h2>
        <p>The Mission to Seafarers Canada, including all affiliated stations across Canada ("the Mission"), provides a parcel pickup service solely as a convenience to seafarers visiting Canada and accessing participating stations offering this service.</p>
        <p>This service is provided on a best-effort basis only and does not constitute, and shall not be interpreted as, a commercial shipping, courier, storage, or logistics service.</p>
        <p>The Mission makes no guarantees regarding the availability, continuity, or performance of this service.</p>

        <h2 style={h2}>2. No Bailment or Custodial Relationship</h2>
        <p>By using this service, you acknowledge and agree that:</p>
        <ul style={ul}>
          <li>The Mission does not act as a courier, warehouse, or storage provider</li>
          <li>The Mission does not assume custody or legal control of any parcel</li>
          <li>No bailment or custodial relationship is created</li>
        </ul>
        <p>All parcels are received and held entirely at the risk of the owner and/or sender.</p>

        <h2 style={h2}>3. Limitation of Liability</h2>
        <p>To the fullest extent permitted by law:</p>
        <ul style={ul}>
          <li>The Mission shall not be liable for any loss, theft, damage, delay, misdelivery, or non-delivery of any parcel</li>
          <li>This includes, but is not limited to: actions or omissions of third-party carriers, customs or port authority decisions, incorrect or incomplete addressing</li>
        </ul>
        <p>If liability is found to exist despite this clause, it shall be strictly limited to the amount paid for the parcel pickup service.</p>

        <h2 style={h2}>4. Indemnification</h2>
        <p>By using this service, you agree to indemnify and hold harmless the Mission to Seafarers Canada, its affiliated stations, directors, employees, volunteers, and partners from any and all claims, damages, losses, liabilities, or legal actions arising from:</p>
        <ul style={ul}>
          <li>The shipment, contents, or handling of any parcel</li>
          <li>Any breach of applicable laws or regulations</li>
          <li>Any misuse of this service</li>
        </ul>

        <h2 style={h2}>5. Sender and Recipient Responsibility</h2>
        <p>You are solely responsible for ensuring that:</p>
        <ul style={ul}>
          <li>All parcels comply with Canadian laws, customs regulations, and port authority requirements</li>
          <li>Contents are legal, safe, and permitted</li>
          <li>Parcels are properly labeled with: full recipient name, vessel name, expected arrival date</li>
          <li>The correct parcel size category is selected</li>
        </ul>
        <p>The Mission assumes no responsibility for improperly prepared or non-compliant parcels.</p>

        <h2 style={h2}>6. Prohibited and Restricted Items</h2>
        <p>The following items are strictly prohibited:</p>
        <ul style={ul}>
          <li>Illegal drugs or controlled substances</li>
          <li>Weapons, explosives, or hazardous materials</li>
          <li>Perishable goods</li>
          <li>Any items restricted under Canadian law or port regulations</li>
        </ul>
        <p>The Mission reserves the right to refuse acceptance, report to appropriate authorities, or dispose of such items without notice.</p>

        <h2 style={h2}>7. Inspection and Compliance</h2>
        <p>All parcels may be subject to inspection by customs or port authorities, and review by Mission staff where safety or compliance concerns arise. The Mission may refuse, remove, or report any parcel deemed unsafe, suspicious, or non-compliant.</p>

        <h2 style={h2}>8. Storage and Collection</h2>
        <ul style={ul}>
          <li>Parcels will be held for a maximum of 7 days</li>
          <li>Valid identification is required at the time of pickup</li>
          <li>The Mission is not responsible if a seafarer departs prior to collection</li>
        </ul>

        <h2 style={h2}>9. Abandoned Property</h2>
        <p>Any parcel not collected within the stated holding period will be deemed abandoned property. The Mission reserves the right to dispose of the parcel, donate contents where appropriate, or return to sender (if feasible, at sender's expense). No liability will be assumed.</p>

        <h2 style={h2}>10. Right to Refuse Service</h2>
        <p>The Mission reserves the right, at its sole discretion, to refuse, reject, or dispose of any parcel, deny access to this service, or take any action deemed necessary without obligation to provide a reason.</p>

        <h2 style={h2}>11. No Guarantee of Service</h2>
        <p>This service is provided on a best-effort basis only. The Mission may modify, suspend, limit, or discontinue the service at any time without notice.</p>

        <h2 style={h2}>12. Privacy and Use of Information</h2>
        <p>Personal information collected for this service will be used solely for operational and administrative purposes related to parcel handling and communication. All information will be handled in accordance with applicable Canadian privacy laws.</p>

        <h2 style={h2}>13. Force Majeure</h2>
        <p>The Mission shall not be liable for any failure or delay in providing the service where such failure or delay results from events beyond its reasonable control, including but not limited to port closures, labour disruptions, weather conditions, government actions, emergencies or unforeseen circumstances.</p>

        <h2 style={h2}>14. Governing Law</h2>
        <p>These Terms & Conditions shall be governed by and interpreted in accordance with the laws of the Province of Ontario and the applicable laws of Canada.</p>

        <h2 style={h2}>15. Acceptance of Terms</h2>
        <p>By using this service, you confirm that you have read and understood these Terms & Conditions, you agree to be legally bound by them, and you accept full responsibility for your parcel and its contents.</p>
      </div>
    </div>
  );
}

const h2 = { fontSize: 17, fontWeight: 700, color: '#0f172a', marginTop: 28, marginBottom: 8 };
const ul = { paddingLeft: 20, margin: '8px 0' };
