import Link from 'next/link';

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1>Where do you stand, Nigeria?</h1>
        <p className="lede">
          Answer questions on the things Nigerians actually argue about: fuel prices, state police, zoning, faith in public life. See
          where you land on ten axes and which people from our history you resemble.
        </p>
        <div className="row">
          <Link className="btn" href="/quiz">Start the quiz</Link>
          <span className="small">Choose 5, 12 or 30 minutes. No login. No names.</span>
        </div>
        <div className="board" aria-label="Quiz at a glance">
          <div><strong>3</strong><span>lengths: 20, 68 or 240 questions</span></div>
          <div><strong>10</strong><span>axes of political thought</span></div>
          <div><strong>20</strong><span>history questions</span></div>
        </div>
      </section>

      <section className="prose-block">
        <h2>What you get at the end</h2>
        <p>
          A profile across ten axes, from how much you trust markets to how you want power shared between regions. A playful persona
          based on your answers. The figures from Nigerian history whose public records are closest to yours, and the ones furthest
          from you. A note where your own answers pull against each other.
        </p>
        <p>
          You also get a history rank. It runs from JAMB Candidate to Professor Emeritus, and it is scored separately, so knowing your
          dates never changes your politics.
        </p>
      </section>

      <section className="prose-block">
        <h2>How we keep it fair</h2>
        <p>
          Every question is worded to be answered from any side, and half of them point each way so clicking agree on everything gets
          you nowhere. Figure profiles come from public records, with sources, and each one is marked as a draft until its claims
          have been checked.
        </p>
        <p>
          Nothing you answer is saved unless you choose to add it to the anonymous group stats. Your result lives in the link, and you
          decide who gets it.
        </p>
        <Link className="btn" href="/quiz">Take the quiz</Link>
      </section>
    </>
  );
}
