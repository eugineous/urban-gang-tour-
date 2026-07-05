// Shared M-Pesa checkout modal for Shop.dc.html and Events.dc.html.
// Plain React.createElement (no JSX) - this file is served as-is, not run
// through dc-runtime's Babel pipeline like the inline <script data-dc-script>
// blocks are, so JSX syntax would fail here.
(function () {
  function useCheckoutModal() {
    var React = window.React;
    var e = React.createElement;

    function Modal(props) {
      var state = React.useState({ step: "phone", phone: "", error: "", orderId: null, totalKes: 0 });
      var s = state[0], setState = state[1];
      var pollRef = React.useRef(null);

      React.useEffect(function () {
        return function () {
          if (pollRef.current) clearInterval(pollRef.current);
        };
      }, []);

      function close() {
        if (pollRef.current) clearInterval(pollRef.current);
        setState({ step: "phone", phone: "", error: "", orderId: null, totalKes: 0 });
        props.onClose();
      }

      function safeJson(r) {
        return r
          .json()
          .catch(function () { return {}; })
          .then(function (data) { return { ok: r.ok, data: data }; });
      }

      function submitPhone(ev) {
        ev.preventDefault();
        setState(function (p) { return Object.assign({}, p, { step: "creating", error: "" }); });
        var createdOrderId = null;
        var createdTotalKes = null;
        fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: props.item.kind,
            eventKey: props.item.eventKey || null,
            itemKey: props.item.itemKey,
            qty: props.item.qty || 1,
            variant: props.item.variant || null,
            phone: s.phone,
          }),
        })
          .then(safeJson)
          .then(function (res) {
            if (!res.ok) {
              throw new Error(res.data.error || "Something went wrong, try again");
            }
            createdOrderId = res.data.orderId;
            createdTotalKes = res.data.totalKes;
            setState(function (p) { return Object.assign({}, p, { step: "paying", orderId: res.data.orderId, totalKes: res.data.totalKes }); });
            return fetch("/api/mpesa/stkpush", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId: res.data.orderId }),
            }).then(safeJson);
          })
          .then(function (pushRes) {
            if (!pushRes.ok) {
              throw new Error(pushRes.data.error || "Couldn't start the M-Pesa prompt, try again");
            }
            var attempts = 0;
            pollRef.current = setInterval(function () {
              attempts++;
              fetch("/api/orders/" + createdOrderId)
                .then(function (r3) { return r3.json(); })
                .then(function (order) {
                  if (order.status === "paid") {
                    clearInterval(pollRef.current);
                    if (window.gtag) {
                      window.gtag("event", "purchase", {
                        transaction_id: createdOrderId,
                        value: createdTotalKes,
                        currency: "KES",
                        items: [{
                          item_id: props.item.itemKey,
                          item_name: props.item.name,
                          item_category: props.item.kind,
                          item_variant: props.item.variant || undefined,
                          quantity: props.item.qty || 1,
                        }],
                      });
                    }
                    setState(function (p) { return Object.assign({}, p, { step: "paid" }); });
                  } else if (order.status === "failed" || attempts > 40) {
                    clearInterval(pollRef.current);
                    setState(function (p) { return Object.assign({}, p, { step: "phone", error: "Payment wasn't completed. Check your phone and try again." }); });
                  }
                })
                .catch(function () {});
            }, 3000);
          })
          .catch(function (err) {
            setState(function (p) { return Object.assign({}, p, { step: "phone", error: (err && err.message) || "Something went wrong, try again" }); });
          });
      }

      var itemLabel = props.item.name + (props.item.variant ? " (" + props.item.variant + ")" : "");

      var body;
      if (s.step === "phone") {
        body = e("form", { onSubmit: submitPhone, style: { display: "flex", flexDirection: "column", gap: 14 } },
          e("div", { style: { fontSize: 14, color: "rgba(255,247,252,0.8)" } }, "Buying: " + itemLabel + (props.item.priceKes ? " - KES " + props.item.priceKes.toLocaleString("en-KE") : "")),
          e("input", {
            type: "tel",
            placeholder: "Safaricom number, e.g. 0712345678",
            value: s.phone,
            autoFocus: true,
            onChange: function (ev) { setState(function (p) { return Object.assign({}, p, { phone: ev.target.value }); }); },
            style: { padding: "13px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.25)", background: "#0d0b0f", color: "#fff", fontSize: 15 },
          }),
          s.error && e("div", { style: { color: "#FF6B6B", fontSize: 13 } }, s.error),
          e("button", { type: "submit", style: { padding: "14px", borderRadius: 10, border: "none", background: "#C7238E", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" } }, "Pay with M-Pesa")
        );
      } else if (s.step === "creating") {
        body = e("div", { style: { textAlign: "center", padding: "20px 0", color: "#fff" } }, "Setting up your order...");
      } else if (s.step === "paying") {
        body = e("div", { style: { textAlign: "center", padding: "10px 0" } },
          e("div", { style: { fontSize: 40 } }, "📲"),
          e("div", { style: { color: "#fff", fontWeight: 700, marginTop: 10 } }, "Check your phone"),
          e("div", { style: { color: "rgba(255,247,252,0.7)", fontSize: 13.5, marginTop: 6 } }, "Enter your M-Pesa PIN to complete the KES " + s.totalKes.toLocaleString("en-KE") + " payment.")
        );
      } else if (s.step === "paid") {
        body = e("div", { style: { textAlign: "center", padding: "10px 0" } },
          e("div", { style: { fontSize: 40 } }, "✅"),
          e("div", { style: { color: "#8FE89A", fontWeight: 700, marginTop: 10, fontSize: 17 } }, "Payment confirmed!"),
          e("div", { style: { color: "rgba(255,247,252,0.7)", fontSize: 13.5, marginTop: 6 } }, "A confirmation email is on its way if you provided one. Welcome to the gang.")
        );
      }

      return e("div", {
        onClick: close,
        style: { position: "fixed", inset: 0, background: "rgba(8,4,7,0.85)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
      },
        e("div", {
          onClick: function (ev) { ev.stopPropagation(); },
          style: { background: "#1B1118", border: "1px solid rgba(199,35,142,0.4)", borderRadius: 20, padding: 30, width: "100%", maxWidth: 380, fontFamily: "'Space Grotesk', sans-serif" },
        },
          e("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
            e("div", { style: { fontFamily: "'Anton', sans-serif", fontSize: 18, color: "#fff", textTransform: "uppercase" } }, "Checkout"),
            e("div", { onClick: close, style: { cursor: "pointer", color: "rgba(255,247,252,0.6)", fontSize: 20 } }, "✕")
          ),
          e("div", { style: { marginTop: 18 } }, body)
        )
      );
    }

    return Modal;
  }

  function init() {
    if (!window.React || !window.ReactDOM || !document.body) {
      setTimeout(init, 100);
      return;
    }
    var Modal = useCheckoutModal();
    var mountEl = document.createElement("div");
    mountEl.id = "ugt-checkout-root";
    document.body.appendChild(mountEl);
    var root = window.ReactDOM.createRoot ? window.ReactDOM.createRoot(mountEl) : null;
    var current = null;

    function render() {
      var el = current ? window.React.createElement(Modal, { item: current, onClose: closeModal }) : null;
      if (root) root.render(el);
      else window.ReactDOM.render(el, mountEl);
    }
    function closeModal() {
      current = null;
      render();
    }

    window.UGTCheckout = {
      open: function (item) {
        current = item;
        render();
      },
    };
  }

  init();
})();
