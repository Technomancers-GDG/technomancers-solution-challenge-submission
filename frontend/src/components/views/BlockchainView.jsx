import { Panel } from "../common/UiPrimitives";

export function BlockchainView({ auditChain, blockchainVerify }) {
  return (
    <div className="view-blockchain">
      <Panel title="Immutable Audit Chain">
        {blockchainVerify && (
          <div className={`chain-status ${blockchainVerify.valid ? "valid" : "invalid"}`}>
            <strong>{blockchainVerify.valid ? "\u2713 Chain Integrity Verified" : "\u26A0 Tampering Detected"}</strong>
            <span>{blockchainVerify.block_count} blocks • Last hash: {(blockchainVerify.last_block_hash ?? "").slice(0, 16)}...</span>
          </div>
        )}
        <div className="chain-list">
          {auditChain.map((b, i) => (
            <div className="chain-block" key={i}>
              <div className="chain-header">
                <span className="chain-index">Block #{b.index}</span>
                <span className="chain-time">{b.timestamp?.slice(0, 19).replace("T", " ")}</span>
              </div>
              <div className="chain-body">
                <div><strong>Type:</strong> {b.decision_type}</div>
                <div><strong>Action:</strong> {b.action}</div>
                <div><strong>Entity:</strong> {b.entity_id}</div>
                <div className="chain-hash" title={b.hash}>Hash: {(b.hash ?? "").slice(0, 20)}...</div>
                <div className="chain-prev" title={b.previous_hash}>Prev: {b.previous_hash?.slice(0, 20)}...</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
