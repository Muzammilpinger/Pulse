import React from "react";
import Icon, { Brand, Mark } from "./Icon";
export default function Welcome({ name, setName, busy, error, join }) {
  return (
    <main className="welcome">
      <header className="welcome-top">
        <Brand />
        <span className="welcome-kicker">
          <span className="dot" /> A little closer, in real time
        </span>
        <a
          className="source-pill"
          href="https://github.com/Muzammilpinger/Pulse"
        >
          Built in the open <Icon name="external" />
        </a>
      </header>
      <div className="welcome-grid">
        <section className="welcome-story">
          <div className="eyebrow">
            <span className="small-line" /> LESS NOISE. MORE CONNECTION.
          </div>
          <h1>
            Good things
            <br />
            start with
            <br />
            <em>a conversation.</em>
          </h1>
          <p>
            A home for your ideas, your people, and the little
            <br className="desktop-break" /> moments in between. Find your
            frequency.
          </p>
          <div className="welcome-art" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="art-center">
              <Mark />
            </div>
            <span className="art-note note-one">
              <span className="note-avatar">P</span>A little hello goes a long
              way.<span className="note-spark">✳</span>
            </span>
            <span className="art-note note-two">
              <Icon name="headphones" />
              <span>
                Some things are better
                <br />
                <strong>said out loud.</strong>
              </span>
              <span className="art-wave">
                <i />
                <i />
                <i />
                <i />
                <i />
              </span>
            </span>
            <span className="art-dot art-dot-one" />
            <span className="art-dot art-dot-two" />
          </div>
          <div className="welcome-features">
            <span>
              <Icon name="message" /> In-the-moment chat
            </span>
            <span>
              <Icon name="headphones" /> A space to talk
            </span>
            <span>
              <Icon name="globe" /> Open to everyone
            </span>
          </div>
        </section>
        <section className="join-card">
          <div className="join-card-top">
            <span className="join-symbol">✳</span>
            <span className="tag">YOUR SPACE IS READY</span>
          </div>
          <h2>
            Come on in<span>.</span>
          </h2>
          <p>
            No introductions needed.
            <br />
            Just a name and something on your mind.
          </p>
          <form onSubmit={join}>
            <label htmlFor="username">Display name</label>
            <div className="name-input">
              <span className="name-avatar">
                {name ? name.slice(0, 2).toUpperCase() : "You"}
              </span>
              <input
                id="username"
                aria-label="Display name"
                autoComplete="nickname"
                placeholder="Your display name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                pattern={"[a-zA-Z0-9_\\-]{2,24}"}
                minLength={2}
                maxLength={24}
                required
              />
            </div>
            <small>2–24 characters · letters, numbers, _ or -</small>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="primary" disabled={busy}>
              {busy ? "Opening workspace…" : "Enter workspace"}
              <Icon name="arrow" />
            </button>
          </form>
          <div className="join-note">
            <span className="dot" /> No account. No fuss. Just conversation.
          </div>
          <div className="join-card-bottom">
            <Icon name="globe" />
            <p>
              A shared, public space. Display names are unverified and everyone
              in the channel can read your messages.
            </p>
          </div>
        </section>
      </div>
      <footer className="welcome-footer">
        <span>SMALL SPACE. BIG POSSIBILITIES.</span>
        <span>
          Independently built by{" "}
          <a href="https://github.com/Muzammilpinger">
            Muzammil <Icon name="external" />
          </a>
        </span>
        <span className="footer-index">01 / CONNECT</span>
      </footer>
    </main>
  );
}
