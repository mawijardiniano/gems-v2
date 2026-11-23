/* First focusable element on every signed-in page. Hidden until a keyboard
   user tabs to it, then jumps past the sidebar and navbar to the page's
   <main id="main-content">. Styled by .skip-link in app/globals.css. */
export default function SkipLink() {
  return (
    <a href="#main-content" className="skip-link">
      Skip to main content
    </a>
  );
}
