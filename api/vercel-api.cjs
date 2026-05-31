var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// api/vercelEntry.ts
var vercelEntry_exports = {};
__export(vercelEntry_exports, {
  default: () => vercelEntry_default
});
module.exports = __toCommonJS(vercelEntry_exports);
var import_serverless_http = __toESM(require("serverless-http"), 1);

// server/app.ts
var import_config = require("dotenv/config");
var import_express = __toESM(require("express"), 1);
var import_resend = require("resend");

// server/email/emailHtmlUtils.ts
function peso(n) {
  return `\u20B1${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatUnitPriceCell(item) {
  const effectiveUnit = item.quantity > 0 ? item.lineTotal / item.quantity : item.unitPrice;
  const gross = item.unitPrice * item.quantity;
  const pct = item.discountPercent && item.discountPercent > 0 ? item.discountPercent : gross > 0 && item.lineTotal < gross - 1e-6 ? (gross - item.lineTotal) / gross * 100 : 0;
  if (pct > 0.05) {
    const pctLabel = Math.abs(pct - Math.round(pct)) < 0.05 ? String(Math.round(pct)) : pct.toFixed(1);
    return `${peso(effectiveUnit)} <span style="color:#059669;white-space:nowrap;">(-${pctLabel}%)</span>`;
  }
  return peso(effectiveUnit);
}
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function formatDate(iso) {
  if (!iso?.trim()) return "\u2014";
  const d = /* @__PURE__ */ new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleDateString("en-PH", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
}
function urgencyBadgeStyle(urgency) {
  switch (urgency) {
    case "Critical":
      return "background:#fef2f2;color:#991b1b;border:1px solid #fecaca;";
    case "High":
      return "background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;";
    case "Low":
      return "background:#f3f4f6;color:#4b5563;border:1px solid #e5e7eb;";
    default:
      return "background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;";
  }
}
function statusBadgeStyle(status) {
  if (status === "Pending") return "background:#fef3c7;color:#92400e;border:1px solid #fde68a;";
  if (status === "Draft") return "background:#f3f4f6;color:#374151;border:1px solid #e5e7eb;";
  if (status === "Approved") return "background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;";
  if (status === "Rejected") return "background:#fef2f2;color:#991b1b;border:1px solid #fecaca;";
  if (status === "Cancelled") return "background:#f3f4f6;color:#374151;border:1px solid #d1d5db;";
  return "background:#f3f4f6;color:#374151;border:1px solid #e5e7eb;";
}
function badge(text, style) {
  return `<span style="display:inline-block;padding:2px 10px;border-radius:9999px;font-size:12px;font-weight:600;${style}">${esc(text)}</span>`;
}
function detailRow(label, value, valueHtml) {
  return `<tr>
    <td style="padding:5px 0 5px 18px;color:#6b7280;font-size:13px;width:148px;vertical-align:top;border:none;">${esc(label)}</td>
    <td style="padding:5px 18px 5px 0;color:#111827;font-size:13px;font-weight:500;border:none;">${valueHtml ?? esc(value)}</td>
  </tr>`;
}
function sectionTitle(title, subtitle) {
  const sub = subtitle?.trim() ? `<div style="font-size:12px;font-weight:500;color:#9ca3af;text-transform:none;letter-spacing:0;margin-top:4px;">${esc(subtitle.trim())}</div>` : "";
  return `<div style="margin:0 0 10px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;font-weight:700;">${esc(title)}${sub}</div>`;
}
function infoCard(title, rows, sectionId, options) {
  const uid = esc(sectionId);
  const metaRow = options?.hideMeta ? "" : `<tr>
      <td colspan="2" style="padding:0 18px 10px;font-size:11px;color:#9ca3af;font-weight:400;text-transform:none;letter-spacing:0;border:none;">
        ${uid}
      </td>
    </tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:16px;border-collapse:separate;">
    <tr>
      <td colspan="2" style="padding:14px 18px 4px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;font-weight:700;border:none;">
        ${esc(title)}
      </td>
    </tr>
    ${metaRow}
    ${rows}
    <tr><td colspan="2" style="padding:0 0 10px;font-size:0;line-height:0;border:none;">&nbsp;</td></tr>
  </table>`;
}
function emailRefLine(orderNumber, label) {
  const sent = (/* @__PURE__ */ new Date()).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
  return `<p style="margin:0 0 18px;font-size:12px;color:#9ca3af;line-height:1.4;">${esc(orderNumber)} \xB7 ${esc(label)} \xB7 ${esc(sent)}</p>`;
}
function emailEntityRef(orderId, kind) {
  return `lamtex-${kind}-${orderId}-${Date.now()}`;
}
function isOrderFullyPaid(balanceDue, paymentStatus) {
  return balanceDue <= 0.01 || paymentStatus === "Paid";
}

// server/email/orderCreatedEmail.ts
function buildOrderCreatedEmailHtml(p) {
  const lineCount = p.lineCount ?? p.items.length;
  const discountAmount = p.discountAmount ?? Math.max(0, p.subtotal - p.totalAmount);
  const lineRows = p.items.map((item) => {
    const variantLine = item.variantDescription ? `<div style="color:#6b7280;font-size:12px;margin-top:2px;">${esc(item.variantDescription)}</div>` : "";
    return `
        <tr>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;">
            <div style="font-weight:600;color:#111827;font-size:14px;">${esc(item.productName)}</div>
            ${variantLine}
          </td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:center;color:#374151;">${item.quantity}</td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:right;color:#374151;">${formatUnitPriceCell(item)}</td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;color:#111827;">${peso(item.lineTotal)}</td>
        </tr>`;
  }).join("");
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const orderUrl9 = `${appUrl.replace(/\/$/, "")}/orders/${p.orderId}`;
  const orderSummaryRows = [
    detailRow("Order number", p.orderNumber),
    detailRow("Status", p.status, badge(p.status, statusBadgeStyle(p.status))),
    detailRow("Urgency", p.urgency ?? "Medium", badge(p.urgency ?? "Medium", urgencyBadgeStyle(p.urgency))),
    detailRow("Order date", formatDate(p.orderDate)),
    detailRow("Required delivery", formatDate(p.requiredDate)),
    detailRow("Line items", String(lineCount))
  ].join("");
  const peopleRows = [
    detailRow("Customer", p.customerName ?? "\u2014"),
    detailRow("Sales agent", p.agentName ?? "\u2014"),
    detailRow("Branch", p.branchName ?? "\u2014")
  ].join("");
  const logisticsRows = [
    p.deliveryType ? detailRow("Delivery type", p.deliveryType) : "",
    p.deliveryAddress ? detailRow("Delivery address", p.deliveryAddress) : "",
    p.paymentTerms ? detailRow("Payment terms", p.paymentTerms) : "",
    p.paymentMethod ? detailRow("Payment method", p.paymentMethod) : ""
  ].filter(Boolean).join("");
  const notesBlock = p.orderNotes?.trim() ? infoCard("Order notes", detailRow("Notes", p.orderNotes.trim()), `${p.orderNumber} \xB7 new order \xB7 notes`) : "";
  const discountRow = discountAmount > 0 ? `<tr>
      <td colspan="3" style="padding:6px 14px;color:#6b7280;text-align:right;">Discount${p.discountPercent ? ` (${p.discountPercent}%)` : ""}</td>
      <td style="padding:6px 14px;text-align:right;color:#059669;">\u2212${peso(discountAmount)}</td>
    </tr>` : "";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="background:linear-gradient(135deg,#dc2626,#991b1b);padding:28px 32px;">
            <div style="color:#fecaca;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;">Lamtex ERP</div>
            <h1 style="margin:10px 0 0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">New order created</h1>
            <p style="margin:8px 0 0;color:#fecaca;font-size:14px;">${esc(p.orderNumber)} \xB7 ${esc(p.branchName ?? "Branch")}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.orderNumber, "New order")}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">An agent has created a new order. Review the details below.</p>
            ${infoCard("Order summary", orderSummaryRows, `${p.orderNumber} \xB7 new order \xB7 summary`)}
            ${infoCard("Customer & agent", peopleRows, `${p.orderNumber} \xB7 new order \xB7 customer & agent`)}
            ${logisticsRows ? infoCard("Delivery & payment", logisticsRows, `${p.orderNumber} \xB7 new order \xB7 delivery`) : ""}
            ${notesBlock}
            ${sectionTitle("Line items", `${p.orderNumber} \xB7 ${lineCount} item(s)`)}
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;font-size:14px;margin-bottom:8px;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th align="left" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em;">Product</th>
                  <th style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Qty</th>
                  <th align="right" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Unit</th>
                  <th align="right" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Total</th>
                </tr>
              </thead>
              <tbody>${lineRows || '<tr><td colspan="4" style="padding:20px;color:#6b7280;text-align:center;">No line items</td></tr>'}</tbody>
              <tfoot>
                <tr>
                  <td colspan="3" style="padding:10px 14px;color:#6b7280;text-align:right;border-top:1px solid #e5e7eb;">Subtotal</td>
                  <td style="padding:10px 14px;text-align:right;border-top:1px solid #e5e7eb;">${peso(p.subtotal)}</td>
                </tr>
                ${discountRow}
                <tr style="background:#fef2f2;">
                  <td colspan="3" style="padding:14px;font-weight:700;color:#991b1b;text-align:right;font-size:15px;">Order total</td>
                  <td style="padding:14px;font-weight:700;color:#991b1b;text-align:right;font-size:17px;">${peso(p.totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
            <div style="margin-top:28px;text-align:center;">
              <a href="${orderUrl9}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">View order</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex ERP \xB7 Automated notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// server/email/orderApprovalEmail.ts
function buildOrderApprovalEmailHtml(p) {
  const items = p.items ?? [];
  const lineCount = p.lineCount ?? items.length;
  const discountAmount = p.discountAmount ?? Math.max(0, p.subtotal - p.totalAmount);
  const lineRows = items.map((item) => {
    const variantLine = item.variantDescription ? `<div style="color:#6b7280;font-size:12px;margin-top:2px;">${esc(item.variantDescription)}</div>` : "";
    return `
        <tr>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;">
            <div style="font-weight:600;color:#111827;font-size:14px;">${esc(item.productName)}</div>
            ${variantLine}
          </td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:center;color:#374151;">${item.quantity}</td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:right;color:#374151;">${formatUnitPriceCell(item)}</td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;color:#111827;">${peso(item.lineTotal)}</td>
        </tr>`;
  }).join("");
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const orderUrl9 = `${appUrl.replace(/\/$/, "")}/orders/${p.orderId}`;
  const orderSummaryRows = [
    detailRow("Order number", p.orderNumber),
    detailRow("Status", p.status, badge(p.status, statusBadgeStyle(p.status))),
    detailRow("Urgency", p.urgency ?? "Medium", badge(p.urgency ?? "Medium", urgencyBadgeStyle(p.urgency))),
    detailRow("Order date", formatDate(p.orderDate)),
    detailRow("Required delivery", formatDate(p.requiredDate)),
    detailRow("Line items", String(lineCount))
  ].join("");
  const peopleRows = [
    detailRow("Customer", p.customerName ?? "\u2014"),
    detailRow("Sales agent", p.agentName ?? "\u2014"),
    detailRow("Branch", p.branchName ?? "\u2014")
  ].join("");
  const logisticsRows = [
    p.deliveryType ? detailRow("Delivery type", p.deliveryType) : "",
    p.deliveryAddress ? detailRow("Delivery address", p.deliveryAddress) : "",
    p.paymentTerms ? detailRow("Payment terms", p.paymentTerms) : ""
  ].filter(Boolean).join("");
  const agentLabel = p.agentName?.trim() || "\u2014";
  const notesBlock = p.orderNotes?.trim() ? infoCard("Order notes", detailRow("Notes", p.orderNotes.trim()), `${p.orderNumber} \xB7 pending approval \xB7 notes`) : "";
  const discountRow = discountAmount > 0 ? `<tr>
      <td colspan="3" style="padding:6px 14px;color:#6b7280;text-align:right;">Discount${p.discountPercent ? ` (${p.discountPercent}%)` : ""}</td>
      <td style="padding:6px 14px;text-align:right;color:#059669;">\u2212${peso(discountAmount)}</td>
    </tr>` : "";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="background:linear-gradient(135deg,#dc2626,#991b1b);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Order awaiting approval by ${esc(agentLabel)}</h1>
            <p style="margin:8px 0 0;color:#fecaca;font-size:14px;">${esc(p.orderNumber)} \xB7 ${esc(p.branchName ?? "Branch")}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.orderNumber, "Awaiting approval")}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">An agent has submitted an order for your review. Summary and line items are below \u2014 open the order in Lamtex to approve or reject.</p>
            ${infoCard("Order summary", orderSummaryRows, `${p.orderNumber} \xB7 pending approval \xB7 summary`)}
            ${infoCard("Customer & agent", peopleRows, `${p.orderNumber} \xB7 pending approval \xB7 customer & agent`)}
            ${logisticsRows ? infoCard("Delivery & payment", logisticsRows, `${p.orderNumber} \xB7 pending approval \xB7 delivery`) : ""}
            ${notesBlock}
            ${sectionTitle("Line items", `${p.orderNumber} \xB7 ${lineCount} item(s)`)}
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;font-size:14px;margin-bottom:8px;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th align="left" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em;">Product</th>
                  <th style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Qty</th>
                  <th align="right" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Unit</th>
                  <th align="right" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Total</th>
                </tr>
              </thead>
              <tbody>${lineRows || '<tr><td colspan="4" style="padding:20px;color:#6b7280;text-align:center;">No line items</td></tr>'}</tbody>
              <tfoot>
                <tr>
                  <td colspan="3" style="padding:10px 14px;color:#6b7280;text-align:right;border-top:1px solid #e5e7eb;">Subtotal</td>
                  <td style="padding:10px 14px;text-align:right;border-top:1px solid #e5e7eb;">${peso(p.subtotal)}</td>
                </tr>
                ${discountRow}
                <tr style="background:#fef2f2;">
                  <td colspan="3" style="padding:14px;font-weight:700;color:#991b1b;text-align:right;font-size:15px;">Order total</td>
                  <td style="padding:14px;font-weight:700;color:#991b1b;text-align:right;font-size:17px;">${peso(p.totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
            <div style="margin-top:28px;text-align:center;">
              <a href="${orderUrl9}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">Review &amp; approve order</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex ERP \xB7 Automated notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// server/email/orderDecisionEmail.ts
function buildOrderDecisionEmailHtml(p) {
  const approved = p.decision === "approved";
  const lineCount = p.lineCount ?? p.items.length;
  const discountAmount = p.discountAmount ?? Math.max(0, p.subtotal - p.totalAmount);
  const decidedLabel = p.decidedBy?.trim() || "Executive";
  const lineRows = p.items.map((item) => {
    const variantLine = item.variantDescription ? `<div style="color:#6b7280;font-size:12px;margin-top:2px;">${esc(item.variantDescription)}</div>` : "";
    return `
        <tr>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;">
            <div style="font-weight:600;color:#111827;font-size:14px;">${esc(item.productName)}</div>
            ${variantLine}
          </td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:center;color:#374151;">${item.quantity}</td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:right;color:#374151;">${formatUnitPriceCell(item)}</td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;color:#111827;">${peso(item.lineTotal)}</td>
        </tr>`;
  }).join("");
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const orderUrl9 = `${appUrl.replace(/\/$/, "")}/orders/${p.orderId}`;
  const headerBg = approved ? "background:linear-gradient(135deg,#059669,#047857);" : "background:linear-gradient(135deg,#dc2626,#991b1b);";
  const headerSub = approved ? "color:#d1fae5;" : "color:#fecaca;";
  const title = approved ? "Your order was approved" : "Your order was rejected";
  const intro = approved ? `Good news \u2014 your order for <strong>${esc(p.customerName ?? "the customer")}</strong> has been approved by ${esc(decidedLabel)}. You can proceed with fulfillment steps in Lamtex.` : `Your order for <strong>${esc(p.customerName ?? "the customer")}</strong> was rejected by ${esc(decidedLabel)}. Review the details below and update the order if needed before resubmitting.`;
  const orderSummaryRows = [
    detailRow("Order number", p.orderNumber),
    detailRow("Status", p.status, badge(p.status, statusBadgeStyle(p.status))),
    detailRow("Customer", p.customerName ?? "\u2014"),
    detailRow("Branch", p.branchName ?? "\u2014"),
    detailRow("Order date", formatDate(p.orderDate)),
    detailRow("Required delivery", formatDate(p.requiredDate)),
    detailRow("Line items", String(lineCount)),
    detailRow("Order total", peso(p.totalAmount))
  ].join("");
  const rejectionBlock = !approved && p.rejectionReason?.trim() ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
          <tr><td style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 18px;">
            <div style="font-size:13px;font-weight:600;color:#991b1b;margin-bottom:4px;">Rejection reason</div>
            <div style="font-size:13px;color:#7f1d1d;line-height:1.5;">${esc(p.rejectionReason.trim())}</div>
          </td></tr>
        </table>` : "";
  const logisticsRows = [
    p.deliveryType ? detailRow("Delivery type", p.deliveryType) : "",
    p.deliveryAddress ? detailRow("Delivery address", p.deliveryAddress) : "",
    p.paymentTerms ? detailRow("Payment terms", p.paymentTerms) : ""
  ].filter(Boolean).join("");
  const decisionKind = approved ? "approved" : "rejected";
  const notesBlock = p.orderNotes?.trim() ? infoCard("Order notes", detailRow("Notes", p.orderNotes.trim()), `${p.orderNumber} \xB7 ${decisionKind} \xB7 notes`) : "";
  const discountRow = discountAmount > 0 ? `<tr>
      <td colspan="3" style="padding:6px 14px;color:#6b7280;text-align:right;">Discount${p.discountPercent ? ` (${p.discountPercent}%)` : ""}</td>
      <td style="padding:6px 14px;text-align:right;color:#059669;">\u2212${peso(discountAmount)}</td>
    </tr>` : "";
  const ctaBg = approved ? "#059669" : "#dc2626";
  const ctaLabel3 = approved ? "View approved order" : "View order &amp; revise";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="${headerBg}padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">${title}</h1>
            <p style="margin:8px 0 0;${headerSub}font-size:14px;">${esc(p.orderNumber)} \xB7 ${esc(p.branchName ?? "Branch")}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.orderNumber, approved ? "Approved" : "Rejected")}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">${intro}</p>
            ${rejectionBlock}
            ${infoCard("Order summary", orderSummaryRows, `${p.orderNumber} \xB7 ${decisionKind} \xB7 summary`)}
            ${logisticsRows ? infoCard("Delivery & payment", logisticsRows, `${p.orderNumber} \xB7 ${decisionKind} \xB7 delivery`) : ""}
            ${notesBlock}
            ${sectionTitle("Line items", `${p.orderNumber} \xB7 ${lineCount} item(s)`)}
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;font-size:14px;margin-bottom:8px;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th align="left" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em;">Product</th>
                  <th style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Qty</th>
                  <th align="right" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Unit</th>
                  <th align="right" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Total</th>
                </tr>
              </thead>
              <tbody>${lineRows || '<tr><td colspan="4" style="padding:20px;color:#6b7280;text-align:center;">No line items</td></tr>'}</tbody>
              <tfoot>
                <tr>
                  <td colspan="3" style="padding:10px 14px;color:#6b7280;text-align:right;border-top:1px solid #e5e7eb;">Subtotal</td>
                  <td style="padding:10px 14px;text-align:right;border-top:1px solid #e5e7eb;">${peso(p.subtotal)}</td>
                </tr>
                ${discountRow}
                <tr style="background:${approved ? "#ecfdf5" : "#fef2f2"};">
                  <td colspan="3" style="padding:14px;font-weight:700;color:${approved ? "#047857" : "#991b1b"};text-align:right;font-size:15px;">Order total</td>
                  <td style="padding:14px;font-weight:700;color:${approved ? "#047857" : "#991b1b"};text-align:right;font-size:17px;">${peso(p.totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
            <div style="margin-top:28px;text-align:center;">
              <a href="${orderUrl9}" style="display:inline-block;background:${ctaBg};color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">${ctaLabel3}</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex \xB7 Automated notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// server/email/orderRevisedEmail.ts
function buildOrderRevisedEmailHtml(p) {
  const lineCount = p.lineCount ?? p.items.length;
  const discountAmount = p.discountAmount ?? Math.max(0, p.subtotal - p.totalAmount);
  const lineRows = p.items.map((item) => {
    const variantLine = item.variantDescription ? `<div style="color:#6b7280;font-size:12px;margin-top:2px;">${esc(item.variantDescription)}</div>` : "";
    return `
        <tr>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;">
            <div style="font-weight:600;color:#111827;font-size:14px;">${esc(item.productName)}</div>
            ${variantLine}
          </td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:center;color:#374151;">${item.quantity}</td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:right;color:#374151;">${formatUnitPriceCell(item)}</td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;color:#111827;">${peso(item.lineTotal)}</td>
        </tr>`;
  }).join("");
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const orderUrl9 = `${appUrl.replace(/\/$/, "")}/orders/${p.orderId}`;
  const orderSummaryRows = [
    detailRow("Order number", p.orderNumber),
    detailRow("Status", p.status, badge(p.status, statusBadgeStyle(p.status))),
    detailRow("Urgency", p.urgency ?? "Medium", badge(p.urgency ?? "Medium", urgencyBadgeStyle(p.urgency))),
    detailRow("Order date", formatDate(p.orderDate)),
    detailRow("Required delivery", formatDate(p.requiredDate)),
    detailRow("Line items", String(lineCount))
  ].join("");
  const peopleRows = [
    detailRow("Customer", p.customerName ?? "\u2014"),
    detailRow("Sales agent", p.agentName ?? "\u2014"),
    detailRow("Branch", p.branchName ?? "\u2014")
  ].join("");
  const logisticsRows = [
    p.deliveryType ? detailRow("Delivery type", p.deliveryType) : "",
    p.deliveryAddress ? detailRow("Delivery address", p.deliveryAddress) : "",
    p.paymentTerms ? detailRow("Payment terms", p.paymentTerms) : ""
  ].filter(Boolean).join("");
  const agentLabel = p.agentName?.trim() || "\u2014";
  const notesBlock = p.orderNotes?.trim() ? infoCard("Order notes", detailRow("Notes", p.orderNotes.trim()), `${p.orderNumber} \xB7 revised \xB7 notes`) : "";
  const previousRejectionBlock = p.previousRejectionReason?.trim() ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr><td style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;">
          <div style="font-size:13px;font-weight:600;color:#92400e;margin-bottom:4px;">Previous rejection reason</div>
          <div style="font-size:13px;color:#78350f;line-height:1.5;">${esc(p.previousRejectionReason.trim())}</div>
        </td></tr>
      </table>` : "";
  const discountRow = discountAmount > 0 ? `<tr>
      <td colspan="3" style="padding:6px 14px;color:#6b7280;text-align:right;">Discount${p.discountPercent ? ` (${p.discountPercent}%)` : ""}</td>
      <td style="padding:6px 14px;text-align:right;color:#059669;">\u2212${peso(discountAmount)}</td>
    </tr>` : "";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="background:linear-gradient(135deg,#d97706,#b45309);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Revised order by ${esc(agentLabel)}</h1>
            <p style="margin:8px 0 0;color:#fde68a;font-size:14px;">${esc(p.orderNumber)} \xB7 ${esc(p.branchName ?? "Branch")}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.orderNumber, "Revised & resubmitted")}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">This order was previously rejected and has been <strong>revised and resubmitted</strong> for your review. Updated summary and line items are below.</p>
            ${previousRejectionBlock}
            ${infoCard("Order summary", orderSummaryRows, `${p.orderNumber} \xB7 revised \xB7 summary`)}
            ${infoCard("Customer & agent", peopleRows, `${p.orderNumber} \xB7 revised \xB7 customer & agent`)}
            ${logisticsRows ? infoCard("Delivery & payment", logisticsRows, `${p.orderNumber} \xB7 revised \xB7 delivery`) : ""}
            ${notesBlock}
            ${sectionTitle("Line items", `${p.orderNumber} \xB7 ${lineCount} item(s)`)}            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;font-size:14px;margin-bottom:8px;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th align="left" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em;">Product</th>
                  <th style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Qty</th>
                  <th align="right" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Unit</th>
                  <th align="right" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Total</th>
                </tr>
              </thead>
              <tbody>${lineRows || '<tr><td colspan="4" style="padding:20px;color:#6b7280;text-align:center;">No line items</td></tr>'}</tbody>
              <tfoot>
                <tr>
                  <td colspan="3" style="padding:10px 14px;color:#6b7280;text-align:right;border-top:1px solid #e5e7eb;">Subtotal</td>
                  <td style="padding:10px 14px;text-align:right;border-top:1px solid #e5e7eb;">${peso(p.subtotal)}</td>
                </tr>
                ${discountRow}
                <tr style="background:#fffbeb;">
                  <td colspan="3" style="padding:14px;font-weight:700;color:#92400e;text-align:right;font-size:15px;">Order total</td>
                  <td style="padding:14px;font-weight:700;color:#92400e;text-align:right;font-size:17px;">${peso(p.totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
            <div style="margin-top:28px;text-align:center;">
              <a href="${orderUrl9}" style="display:inline-block;background:#d97706;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">Review revised order</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex \xB7 Automated notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// server/email/orderCancelledEmail.ts
function buildOrderCancelledEmailHtml(p) {
  const forAgent = p.notifyTarget === "agent";
  const lineCount = p.lineCount ?? p.items.length;
  const discountAmount = p.discountAmount ?? Math.max(0, p.subtotal - p.totalAmount);
  const cancelledLabel = p.cancelledBy?.trim() || (forAgent ? "Executive" : "Agent");
  const agentLabel = p.agentName?.trim() || "\u2014";
  const lineRows = p.items.map((item) => {
    const variantLine = item.variantDescription ? `<div style="color:#6b7280;font-size:12px;margin-top:2px;">${esc(item.variantDescription)}</div>` : "";
    return `
        <tr>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;">
            <div style="font-weight:600;color:#111827;font-size:14px;">${esc(item.productName)}</div>
            ${variantLine}
          </td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:center;color:#374151;">${item.quantity}</td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:right;color:#374151;">${formatUnitPriceCell(item)}</td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;color:#111827;">${peso(item.lineTotal)}</td>
        </tr>`;
  }).join("");
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const orderUrl9 = `${appUrl.replace(/\/$/, "")}/orders/${p.orderId}`;
  const headerBg = forAgent ? "background:linear-gradient(135deg,#4b5563,#374151);" : "background:linear-gradient(135deg,#7c3aed,#5b21b6);";
  const headerSub = forAgent ? "color:#d1d5db;" : "color:#ddd6fe;";
  const title = forAgent ? "Your order was cancelled" : `Order cancelled by ${esc(agentLabel)}`;
  const refLabel = forAgent ? "Cancelled by executive" : "Cancelled by agent";
  const intro = forAgent ? `Your order for <strong>${esc(p.customerName ?? "the customer")}</strong> was cancelled by ${esc(cancelledLabel)}. Details and line items are below.` : `The agent <strong>${esc(agentLabel)}</strong> cancelled order ${esc(p.orderNumber)} for ${esc(p.customerName ?? "the customer")}. Review the details below.`;
  const orderSummaryRows = [
    detailRow("Order number", p.orderNumber),
    detailRow("Status", p.status, badge(p.status, statusBadgeStyle(p.status))),
    detailRow("Customer", p.customerName ?? "\u2014"),
    detailRow("Branch", p.branchName ?? "\u2014"),
    detailRow("Sales agent", p.agentName ?? "\u2014"),
    detailRow("Order date", formatDate(p.orderDate)),
    detailRow("Required delivery", formatDate(p.requiredDate)),
    detailRow("Urgency", p.urgency ?? "Medium", badge(p.urgency ?? "Medium", urgencyBadgeStyle(p.urgency))),
    detailRow("Line items", String(lineCount)),
    detailRow("Order total", peso(p.totalAmount))
  ].join("");
  const reasonBlock = p.cancellationReason?.trim() ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
        <tr><td style="background:#f3f4f6;border:1px solid #d1d5db;border-radius:10px;padding:14px 18px;">
          <div style="font-size:13px;font-weight:600;color:#374151;margin-bottom:4px;">Cancellation reason</div>
          <div style="font-size:13px;color:#4b5563;line-height:1.5;">${esc(p.cancellationReason.trim())}</div>
          ${p.additionalNotes?.trim() ? `<div style="font-size:12px;color:#6b7280;margin-top:8px;line-height:1.5;"><strong>Notes:</strong> ${esc(p.additionalNotes.trim())}</div>` : ""}
        </td></tr>
      </table>` : "";
  const logisticsRows = [
    p.deliveryType ? detailRow("Delivery type", p.deliveryType) : "",
    p.deliveryAddress ? detailRow("Delivery address", p.deliveryAddress) : "",
    p.paymentTerms ? detailRow("Payment terms", p.paymentTerms) : ""
  ].filter(Boolean).join("");
  const cancelKind = forAgent ? "agent-notify" : "exec-notify";
  const discountRow = discountAmount > 0 ? `<tr>
      <td colspan="3" style="padding:6px 14px;color:#6b7280;text-align:right;">Discount${p.discountPercent ? ` (${p.discountPercent}%)` : ""}</td>
      <td style="padding:6px 14px;text-align:right;color:#059669;">\u2212${peso(discountAmount)}</td>
    </tr>` : "";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="${headerBg}padding:28px 32px;">
            <div style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">${title}</div>
            <p style="margin:8px 0 0;${headerSub}font-size:14px;">${esc(p.orderNumber)} \xB7 ${esc(p.branchName ?? "Branch")}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.orderNumber, refLabel)}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">${intro}</p>
            ${reasonBlock}
            ${infoCard("Order summary", orderSummaryRows, `${p.orderNumber} \xB7 cancelled \xB7 ${cancelKind} \xB7 summary`)}
            ${logisticsRows ? infoCard("Delivery & payment", logisticsRows, `${p.orderNumber} \xB7 cancelled \xB7 ${cancelKind} \xB7 delivery`) : ""}
            ${sectionTitle("Line items", `${p.orderNumber} \xB7 ${lineCount} item(s)`)}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;font-size:14px;margin-bottom:8px;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th align="left" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em;">Product</th>
                  <th style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Qty</th>
                  <th align="right" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Unit</th>
                  <th align="right" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Total</th>
                </tr>
              </thead>
              <tbody>${lineRows || '<tr><td colspan="4" style="padding:20px;color:#6b7280;text-align:center;">No line items</td></tr>'}</tbody>
              <tfoot>
                <tr>
                  <td colspan="3" style="padding:10px 14px;color:#6b7280;text-align:right;border-top:1px solid #e5e7eb;">Subtotal</td>
                  <td style="padding:10px 14px;text-align:right;border-top:1px solid #e5e7eb;">${peso(p.subtotal)}</td>
                </tr>
                ${discountRow}
                <tr style="background:#f3f4f6;">
                  <td colspan="3" style="padding:14px;font-weight:700;color:#374151;text-align:right;font-size:15px;">Order total</td>
                  <td style="padding:14px;font-weight:700;color:#374151;text-align:right;font-size:17px;">${peso(p.totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
            <div style="margin-top:28px;text-align:center;">
              <a href="${orderUrl9}" style="display:inline-block;background:${forAgent ? "#4b5563" : "#7c3aed"};color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">View order</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex \xB7 Automated notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// server/email/orderLogisticsReadyEmail.ts
function logisticsScheduleUrl(p) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const base = `${appUrl.replace(/\/$/, "")}/logistics?order=${p.orderId}`;
  if (p.deliveryType === "Ship") return `${base}&tab=dispatch&mode=interisland`;
  return `${base}&tab=routes`;
}
function buildOrderLogisticsReadyEmailHtml(p) {
  const lineCount = p.lineCount ?? p.items.length;
  const approvedLabel = p.approvedBy?.trim() || "Executive";
  const isShip = p.deliveryType === "Ship";
  const ctaLabel3 = isShip ? "Schedule shipment" : "Plan route";
  const scheduleUrl = logisticsScheduleUrl(p);
  const orderSummaryRows = [
    detailRow("Order number", p.orderNumber),
    detailRow("Status", p.status, badge(p.status, statusBadgeStyle(p.status))),
    detailRow("Urgency", p.urgency ?? "Medium", badge(p.urgency ?? "Medium", urgencyBadgeStyle(p.urgency))),
    detailRow("Customer", p.customerName ?? "\u2014"),
    detailRow("Sales agent", p.agentName ?? "\u2014"),
    detailRow("Branch", p.branchName ?? "\u2014"),
    detailRow("Order date", formatDate(p.orderDate)),
    detailRow("Required delivery", formatDate(p.requiredDate)),
    detailRow("Line items", String(lineCount)),
    detailRow("Order total", peso(p.totalAmount)),
    detailRow("Approved by", approvedLabel)
  ].join("");
  const logisticsRows = [
    p.deliveryType ? detailRow("Delivery type", p.deliveryType) : "",
    p.deliveryAddress ? detailRow("Delivery address", p.deliveryAddress) : "",
    p.paymentTerms ? detailRow("Payment terms", p.paymentTerms) : ""
  ].filter(Boolean).join("");
  const notesBlock = p.orderNotes?.trim() ? infoCard("Order notes", detailRow("Notes", p.orderNotes.trim()), `${p.orderNumber} \xB7 ready to schedule \xB7 notes`) : "";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Order ready to schedule</h1>
            <p style="margin:8px 0 0;color:#dbeafe;font-size:14px;">${esc(p.orderNumber)} \xB7 ${esc(p.branchName ?? "Branch")}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.orderNumber, "Ready to schedule")}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">
              Order <strong>${esc(p.orderNumber)}</strong> for <strong>${esc(p.customerName ?? "the customer")}</strong>
              was approved by ${esc(approvedLabel)} and is ready for ${isShip ? "shipment scheduling" : "route planning"} in Lamtex.
            </p>
            ${infoCard("Order summary", orderSummaryRows, `${p.orderNumber} \xB7 ready to schedule \xB7 summary`)}
            ${logisticsRows ? infoCard("Delivery & payment", logisticsRows, `${p.orderNumber} \xB7 ready to schedule \xB7 delivery`) : ""}
            ${notesBlock}
            ${sectionTitle("Next step", `${p.orderNumber} \xB7 logistics`)}
            <p style="margin:0 0 20px;color:#374151;font-size:14px;line-height:1.55;">
              Open the logistics workspace to ${isShip ? "assign this order to a vessel dispatch" : "add this order to a delivery route"}.
            </p>
            <div style="text-align:center;">
              <a href="${scheduleUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">${ctaLabel3}</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex \xB7 Automated notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// server/email/orderLogisticsLoadingEmail.ts
function logisticsOrderUrl(p) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const base = `${appUrl.replace(/\/$/, "")}/logistics?order=${p.orderId}`;
  if (p.deliveryType === "Ship") return `${base}&tab=dispatch&mode=interisland`;
  return `${base}&tab=routes`;
}
function buildOrderLogisticsLoadingEmailHtml(p) {
  const lineCount = p.lineCount ?? p.items.length;
  const markedLabel = p.markedBy?.trim() || "Warehouse";
  const logisticsUrl = logisticsOrderUrl(p);
  const orderSummaryRows = [
    detailRow("Order number", p.orderNumber),
    detailRow("Status", p.status, badge(p.status, statusBadgeStyle(p.status))),
    detailRow("Urgency", p.urgency ?? "Medium", badge(p.urgency ?? "Medium", urgencyBadgeStyle(p.urgency))),
    detailRow("Customer", p.customerName ?? "\u2014"),
    detailRow("Sales agent", p.agentName ?? "\u2014"),
    detailRow("Branch", p.branchName ?? "\u2014"),
    detailRow("Order date", formatDate(p.orderDate)),
    detailRow("Required delivery", formatDate(p.requiredDate)),
    detailRow("Line items", String(lineCount)),
    detailRow("Order total", peso(p.totalAmount)),
    detailRow("Loading started by", markedLabel)
  ].join("");
  const logisticsRows = [
    p.deliveryType ? detailRow("Delivery type", p.deliveryType) : "",
    p.deliveryAddress ? detailRow("Delivery address", p.deliveryAddress) : "",
    p.paymentTerms ? detailRow("Payment terms", p.paymentTerms) : ""
  ].filter(Boolean).join("");
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="background:linear-gradient(135deg,#d97706,#b45309);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Order loading started</h1>
            <p style="margin:8px 0 0;color:#fef3c7;font-size:14px;">${esc(p.orderNumber)} \xB7 ${esc(p.branchName ?? "Branch")}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.orderNumber, "Loading at warehouse")}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">
              Order <strong>${esc(p.orderNumber)}</strong> for <strong>${esc(p.customerName ?? "the customer")}</strong>
              is now being loaded at the warehouse${markedLabel ? ` (${esc(markedLabel)})` : ""}.
              Track progress in the logistics workspace.
            </p>
            ${infoCard("Order summary", orderSummaryRows, `${p.orderNumber} \xB7 loading \xB7 summary`)}
            ${logisticsRows ? infoCard("Delivery & payment", logisticsRows, `${p.orderNumber} \xB7 loading \xB7 delivery`) : ""}
            ${sectionTitle("Next step", `${p.orderNumber} \xB7 logistics`)}
            <div style="text-align:center;margin-top:8px;">
              <a href="${logisticsUrl}" style="display:inline-block;background:#d97706;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">Open logistics</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex \xB7 Automated notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// server/email/orderPackedEmail.ts
function orderUrl(p) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  if (p.notifyTarget === "logistics") {
    const base = `${appUrl.replace(/\/$/, "")}/logistics?order=${p.orderId}`;
    if (p.deliveryType === "Ship") return `${base}&tab=dispatch&mode=interisland`;
    return `${base}&tab=routes`;
  }
  return `${appUrl.replace(/\/$/, "")}/orders/${p.orderId}`;
}
function buildOrderPackedEmailHtml(p) {
  const target = p.notifyTarget;
  const lineCount = p.lineCount ?? p.items.length;
  const markedLabel = p.markedBy?.trim() || "Warehouse";
  const ctaUrl = orderUrl(p);
  const headerStyles = {
    logistics: {
      bg: "background:linear-gradient(135deg,#059669,#047857);",
      sub: "color:#d1fae5;",
      title: "Order packed \u2014 ready for dispatch"
    },
    agent: {
      bg: "background:linear-gradient(135deg,#4f46e5,#4338ca);",
      sub: "color:#e0e7ff;",
      title: "Your customer order is packed"
    }
  }[target];
  const intro = target === "logistics" ? `Order <strong>${esc(p.orderNumber)}</strong> for <strong>${esc(p.customerName ?? "the customer")}</strong> has been packed at the warehouse${markedLabel ? ` (${esc(markedLabel)})` : ""}. It is ready for dispatch planning.` : `Order <strong>${esc(p.orderNumber)}</strong> for <strong>${esc(p.customerName ?? "your customer")}</strong> has been packed${markedLabel ? ` by ${esc(markedLabel)}` : ""} and is ready for dispatch.`;
  const orderSummaryRows = [
    detailRow("Order number", p.orderNumber),
    detailRow("Status", p.status, badge(p.status, statusBadgeStyle(p.status))),
    detailRow("Urgency", p.urgency ?? "Medium", badge(p.urgency ?? "Medium", urgencyBadgeStyle(p.urgency))),
    detailRow("Customer", p.customerName ?? "\u2014"),
    detailRow("Sales agent", p.agentName ?? "\u2014"),
    detailRow("Branch", p.branchName ?? "\u2014"),
    detailRow("Order date", formatDate(p.orderDate)),
    detailRow("Required delivery", formatDate(p.requiredDate)),
    detailRow("Line items", String(lineCount)),
    detailRow("Order total", peso(p.totalAmount)),
    detailRow("Packed by", markedLabel)
  ].join("");
  const logisticsRows = [
    p.deliveryType ? detailRow("Delivery type", p.deliveryType) : "",
    p.deliveryAddress ? detailRow("Delivery address", p.deliveryAddress) : "",
    p.paymentTerms ? detailRow("Payment terms", p.paymentTerms) : ""
  ].filter(Boolean).join("");
  const ctaLabel3 = target === "logistics" ? "Open logistics" : "View order";
  const ctaColor = target === "logistics" ? "#059669" : "#4f46e5";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="${headerStyles.bg}padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">${headerStyles.title}</h1>
            <p style="margin:8px 0 0;${headerStyles.sub}font-size:14px;">${esc(p.orderNumber)} \xB7 ${esc(p.branchName ?? "Branch")}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.orderNumber, "Packed")}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">${intro}</p>
            ${infoCard("Order summary", orderSummaryRows, `${p.orderNumber} \xB7 packed \xB7 summary`)}
            ${logisticsRows ? infoCard("Delivery & payment", logisticsRows, `${p.orderNumber} \xB7 packed \xB7 delivery`) : ""}
            ${sectionTitle("Next step", `${p.orderNumber} \xB7 packed`)}
            <div style="text-align:center;margin-top:8px;">
              <a href="${ctaUrl}" style="display:inline-block;background:${ctaColor};color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">${ctaLabel3}</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex \xB7 Automated notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// server/email/orderInTransitEmail.ts
function orderUrl2(orderId) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  return `${appUrl.replace(/\/$/, "")}/orders/${orderId}`;
}
function buildOrderInTransitEmailHtml(p) {
  const target = p.notifyTarget;
  const lineCount = p.lineCount ?? p.items.length;
  const markedLabel = p.markedBy?.trim() || "Logistics";
  const tripLabel = p.tripNumber?.trim() || "\u2014";
  const vehicleLabel = p.vehicleName?.trim() || "\u2014";
  const driverLabel = p.driverName?.trim() || "\u2014";
  const headerStyles = {
    executive: {
      bg: "background:linear-gradient(135deg,#0f766e,#115e59);",
      sub: "color:#ccfbf1;",
      title: "Order in transit"
    },
    warehouse: {
      bg: "background:linear-gradient(135deg,#d97706,#b45309);",
      sub: "color:#fef3c7;",
      title: "Order departed \u2014 in transit"
    },
    agent: {
      bg: "background:linear-gradient(135deg,#4f46e5,#4338ca);",
      sub: "color:#e0e7ff;",
      title: "Your customer order is in transit"
    }
  }[target];
  const intro = target === "executive" ? `Order <strong>${esc(p.orderNumber)}</strong> for <strong>${esc(p.customerName ?? "the customer")}</strong> is now in transit${markedLabel ? ` (${esc(markedLabel)})` : ""}. Shipment details are below.` : target === "warehouse" ? `Order <strong>${esc(p.orderNumber)}</strong> for <strong>${esc(p.customerName ?? "the customer")}</strong> has left the warehouse and is in transit${markedLabel ? ` \u2014 recorded by ${esc(markedLabel)}` : ""}.` : `Order <strong>${esc(p.orderNumber)}</strong> for your customer <strong>${esc(p.customerName ?? "the customer")}</strong> is now in transit and on the way for delivery.`;
  const orderSummaryRows = [
    detailRow("Order number", p.orderNumber),
    detailRow("Status", p.status, badge(p.status, statusBadgeStyle(p.status))),
    detailRow("Customer", p.customerName ?? "\u2014"),
    detailRow("Sales agent", p.agentName ?? "\u2014"),
    detailRow("Branch", p.branchName ?? "\u2014"),
    detailRow("Trip / shipment", tripLabel),
    detailRow("Vehicle / container", vehicleLabel),
    p.driverName?.trim() ? detailRow("Driver", driverLabel) : "",
    detailRow("Required delivery", formatDate(p.requiredDate)),
    detailRow("Urgency", p.urgency ?? "Medium", badge(p.urgency ?? "Medium", urgencyBadgeStyle(p.urgency))),
    detailRow("Line items", String(lineCount)),
    detailRow("Order total", peso(p.totalAmount)),
    detailRow("Dispatched by", markedLabel)
  ].filter(Boolean).join("");
  const logisticsRows = [
    p.deliveryType ? detailRow("Delivery type", p.deliveryType) : "",
    p.deliveryAddress ? detailRow("Delivery address", p.deliveryAddress) : "",
    p.paymentTerms ? detailRow("Payment terms", p.paymentTerms) : ""
  ].filter(Boolean).join("");
  const refLabel = target === "executive" ? "In transit" : target === "warehouse" ? "Departed warehouse" : "In transit for customer";
  const ctaLabel3 = "View order";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="${headerStyles.bg}padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">${headerStyles.title}</h1>
            <p style="margin:8px 0 0;${headerStyles.sub}font-size:14px;">${esc(p.orderNumber)} \xB7 ${esc(p.branchName ?? "Branch")}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.orderNumber, refLabel)}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">${intro}</p>
            ${infoCard("Shipment summary", orderSummaryRows, `${p.orderNumber} \xB7 in transit \xB7 summary`)}
            ${logisticsRows ? infoCard("Delivery & payment", logisticsRows, `${p.orderNumber} \xB7 in transit \xB7 delivery`) : ""}
            ${sectionTitle("Next step", `${p.orderNumber} \xB7 in transit`)}
            <div style="text-align:center;margin-top:8px;">
              <a href="${orderUrl2(p.orderId)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">${ctaLabel3}</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex \xB7 Automated notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// server/email/orderCustomerApprovedEmail.ts
function customerPortalUrl(p) {
  if (!p.portalToken?.trim()) return null;
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  return `${appUrl.replace(/\/$/, "")}/order/${encodeURIComponent(p.portalToken.trim())}`;
}
function agentContactCard(agent, orderNumber) {
  const phone = agent.phone?.trim();
  const email = agent.email?.trim();
  const phoneRow = phone ? detailRow(
    "Phone",
    phone,
    `<a href="tel:${phone.replace(/[^\d+]/g, "")}" style="color:#047857;font-weight:600;text-decoration:none;">${esc(phone)}</a>`
  ) : "";
  const emailRow = email ? detailRow(
    "Email",
    email,
    `<a href="mailto:${encodeURIComponent(email)}" style="color:#047857;font-weight:600;text-decoration:none;">${esc(email)}</a>`
  ) : "";
  const fallback = !phone && !email ? `<p style="margin:12px 0 0;color:#6b7280;font-size:13px;line-height:1.5;">Contact details for your agent are not on file. Please reply to this message or call your Lamtex branch for assistance.</p>` : "";
  return infoCard(
    "Your sales agent",
    [
      detailRow("Name", agent.name?.trim() || "\u2014"),
      phoneRow,
      emailRow
    ].filter(Boolean).join(""),
    `${orderNumber} \xB7 customer \xB7 agent contact`,
    { hideMeta: true }
  ).concat(fallback);
}
function buildOrderCustomerApprovedEmailHtml(p) {
  const lineCount = p.lineCount ?? p.items.length;
  const discountAmount = p.discountAmount ?? Math.max(0, p.subtotal - p.totalAmount);
  const greetingName = p.customerContactPerson?.trim() || p.customerName?.trim() || "Valued customer";
  const portalUrl = customerPortalUrl(p);
  const lineRows = p.items.map((item) => {
    const variantLine = item.variantDescription ? `<div style="color:#6b7280;font-size:12px;margin-top:2px;">${esc(item.variantDescription)}</div>` : "";
    return `
        <tr>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;">
            <div style="font-weight:600;color:#111827;font-size:14px;">${esc(item.productName)}</div>
            ${variantLine}
          </td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:center;color:#374151;">${item.quantity}</td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:right;color:#374151;">${formatUnitPriceCell(item)}</td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;color:#111827;">${peso(item.lineTotal)}</td>
        </tr>`;
  }).join("");
  const orderSummaryRows = [
    detailRow("Order number", p.orderNumber),
    detailRow("Status", p.status, badge(p.status, statusBadgeStyle(p.status))),
    detailRow("Order date", formatDate(p.orderDate)),
    detailRow("Required delivery", formatDate(p.requiredDate)),
    detailRow("Line items", String(lineCount)),
    p.deliveryType ? detailRow("Delivery type", p.deliveryType) : "",
    p.deliveryAddress ? detailRow("Delivery address", p.deliveryAddress) : "",
    p.paymentTerms ? detailRow("Payment terms", p.paymentTerms) : ""
  ].filter(Boolean).join("");
  const discountRow = discountAmount > 0 ? `<tr>
      <td colspan="3" style="padding:6px 14px;color:#6b7280;text-align:right;">Discount${p.discountPercent ? ` (${p.discountPercent}%)` : ""}</td>
      <td style="padding:6px 14px;text-align:right;color:#059669;">\u2212${peso(discountAmount)}</td>
    </tr>` : "";
  const portalBlock = portalUrl ? `${sectionTitle("View your order online")}
       <div style="margin-top:12px;text-align:center;">
         <a href="${portalUrl}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">View order status</a>
       </div>` : "";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="background:linear-gradient(135deg,#059669,#047857);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Your order has been approved</h1>
            <p style="margin:8px 0 0;color:#d1fae5;font-size:14px;">${esc(p.orderNumber)} \xB7 ${esc(p.branchName ?? "Lamtex")}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 8px;color:#111827;font-size:15px;line-height:1.55;">Hello ${esc(greetingName)},</p>
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">
              Good news \u2014 your order <strong>${esc(p.orderNumber)}</strong> has been approved and is moving forward.
              Our team will begin preparing your order for delivery. Your sales agent will reach out if anything changes.
            </p>
            ${infoCard("Order summary", orderSummaryRows, `${p.orderNumber} \xB7 customer \xB7 summary`, { hideMeta: true })}
            ${agentContactCard(p.agent, p.orderNumber)}
            ${sectionTitle("Order details")}
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;font-size:14px;margin-bottom:8px;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th align="left" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em;">Product</th>
                  <th style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Qty</th>
                  <th align="right" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Unit</th>
                  <th align="right" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Total</th>
                </tr>
              </thead>
              <tbody>${lineRows || '<tr><td colspan="4" style="padding:20px;color:#6b7280;text-align:center;">No line items</td></tr>'}</tbody>
              <tfoot>
                <tr>
                  <td colspan="3" style="padding:10px 14px;color:#6b7280;text-align:right;border-top:1px solid #e5e7eb;">Subtotal</td>
                  <td style="padding:10px 14px;text-align:right;border-top:1px solid #e5e7eb;">${peso(p.subtotal)}</td>
                </tr>
                ${discountRow}
                <tr style="background:#ecfdf5;">
                  <td colspan="3" style="padding:14px;font-weight:700;color:#047857;text-align:right;font-size:15px;">Order total</td>
                  <td style="padding:14px;font-weight:700;color:#047857;text-align:right;font-size:17px;">${peso(p.totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
            ${portalBlock}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex \xB7 Order notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// server/email/orderCustomerInTransitEmail.ts
function buildOrderCustomerInTransitEmailHtml(p) {
  const greetingName = p.customerContactPerson?.trim() || p.customerName?.trim() || "Valued customer";
  const portalUrl = customerPortalUrl(p);
  const tripLabel = p.tripNumber?.trim() || null;
  const orderSummaryRows = [
    detailRow("Order number", p.orderNumber),
    detailRow("Status", "In Transit", badge("In Transit", statusBadgeStyle("In Transit"))),
    tripLabel ? detailRow("Shipment reference", tripLabel) : "",
    p.vehicleName?.trim() ? detailRow("Vehicle", p.vehicleName.trim()) : "",
    detailRow("Required delivery", formatDate(p.requiredDate)),
    p.deliveryType ? detailRow("Delivery type", p.deliveryType) : "",
    p.deliveryAddress ? detailRow("Delivery address", p.deliveryAddress) : ""
  ].filter(Boolean).join("");
  const portalBlock = portalUrl ? `${sectionTitle("Track your order")}
       <div style="margin-top:12px;text-align:center;">
         <a href="${portalUrl}" style="display:inline-block;background:#d97706;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">View order status</a>
       </div>` : "";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="background:linear-gradient(135deg,#d97706,#b45309);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Your order is on the way</h1>
            <p style="margin:8px 0 0;color:#fef3c7;font-size:14px;">${esc(p.orderNumber)} \xB7 ${esc(p.branchName ?? "Lamtex")}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 8px;color:#111827;font-size:15px;line-height:1.55;">Hello ${esc(greetingName)},</p>
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">
              Your order <strong>${esc(p.orderNumber)}</strong> has left our warehouse and is now <strong>in transit</strong>.
              Our team is working to deliver it to you. Your sales agent can help if you have questions about delivery timing.
            </p>
            ${infoCard("Shipment details", orderSummaryRows, `${p.orderNumber} \xB7 customer \xB7 in transit`, { hideMeta: true })}
            ${agentContactCard(p.agent, p.orderNumber)}
            ${portalBlock}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex \xB7 Order notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// server/email/orderDeliveryRecordedEmail.ts
function orderUrl3(orderId) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  return `${appUrl.replace(/\/$/, "")}/orders/${orderId}`;
}
function buildOrderDeliveryRecordedEmailHtml(p) {
  const target = p.notifyTarget;
  const lineCount = p.lineCount ?? p.items.length;
  const recordedLabel = p.recordedBy?.trim() || "Logistics";
  const isComplete = p.status === "Delivered";
  const tripLabel = p.tripNumber?.trim() || "\u2014";
  const headerStyles = {
    executive: {
      bg: "background:linear-gradient(135deg,#0f766e,#115e59);",
      sub: "color:#ccfbf1;",
      title: isComplete ? "Order delivered" : "Partial delivery recorded"
    },
    agent: {
      bg: "background:linear-gradient(135deg,#4f46e5,#4338ca);",
      sub: "color:#e0e7ff;",
      title: isComplete ? "Your customer order was delivered" : "Partial delivery recorded"
    }
  }[target];
  const intro = isComplete ? target === "executive" ? `Order <strong>${esc(p.orderNumber)}</strong> for <strong>${esc(p.customerName ?? "the customer")}</strong> was fully delivered${recordedLabel ? ` (${esc(recordedLabel)})` : ""}.` : `Order <strong>${esc(p.orderNumber)}</strong> for your customer <strong>${esc(p.customerName ?? "the customer")}</strong> was fully delivered${recordedLabel ? ` \u2014 recorded by ${esc(recordedLabel)}` : ""}.` : target === "executive" ? `A partial delivery was recorded for order <strong>${esc(p.orderNumber)}</strong> (${esc(p.customerName ?? "the customer")})${recordedLabel ? ` by ${esc(recordedLabel)}` : ""}.` : `A partial delivery was recorded for order <strong>${esc(p.orderNumber)}</strong> for <strong>${esc(p.customerName ?? "your customer")}</strong>${recordedLabel ? ` by ${esc(recordedLabel)}` : ""}.`;
  const orderSummaryRows = [
    detailRow("Order number", p.orderNumber),
    detailRow("Status", p.status, badge(p.status, statusBadgeStyle(p.status))),
    detailRow("Customer", p.customerName ?? "\u2014"),
    detailRow("Sales agent", p.agentName ?? "\u2014"),
    detailRow("Branch", p.branchName ?? "\u2014"),
    detailRow("Trip / shipment", tripLabel),
    p.actualDelivery ? detailRow("Delivery date", formatDate(p.actualDelivery)) : "",
    detailRow("Required delivery", formatDate(p.requiredDate)),
    detailRow("Urgency", p.urgency ?? "Medium", badge(p.urgency ?? "Medium", urgencyBadgeStyle(p.urgency))),
    detailRow("Line items", String(lineCount)),
    detailRow("Order total", peso(p.totalAmount)),
    detailRow("Recorded by", recordedLabel)
  ].filter(Boolean).join("");
  const logisticsRows = [
    p.deliveryType ? detailRow("Delivery type", p.deliveryType) : "",
    p.deliveryAddress ? detailRow("Delivery address", p.deliveryAddress) : "",
    p.paymentTerms ? detailRow("Payment terms", p.paymentTerms) : ""
  ].filter(Boolean).join("");
  const refLabel = isComplete ? "Delivered" : "Partial delivery";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="${headerStyles.bg}padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">${headerStyles.title}</h1>
            <p style="margin:8px 0 0;${headerStyles.sub}font-size:14px;">${esc(p.orderNumber)} \xB7 ${esc(p.branchName ?? "Branch")}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.orderNumber, refLabel)}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">${intro}</p>
            ${infoCard("Delivery summary", orderSummaryRows, `${p.orderNumber} \xB7 delivery \xB7 summary`)}
            ${logisticsRows ? infoCard("Delivery & payment", logisticsRows, `${p.orderNumber} \xB7 delivery \xB7 details`) : ""}
            ${sectionTitle("Next step", `${p.orderNumber} \xB7 delivery`)}
            <div style="text-align:center;margin-top:8px;">
              <a href="${orderUrl3(p.orderId)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">View order</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex \xB7 Automated notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// server/email/orderCustomerDeliveryRecordedEmail.ts
function buildOrderCustomerDeliveryRecordedEmailHtml(p) {
  const greetingName = p.customerContactPerson?.trim() || p.customerName?.trim() || "Valued customer";
  const portalUrl = customerPortalUrl(p);
  const isComplete = p.status === "Delivered";
  const tripLabel = p.tripNumber?.trim() || null;
  const orderSummaryRows = [
    detailRow("Order number", p.orderNumber),
    detailRow(
      "Status",
      p.status,
      badge(p.status, statusBadgeStyle(p.status))
    ),
    tripLabel ? detailRow("Shipment reference", tripLabel) : "",
    p.actualDelivery ? detailRow("Delivery date", formatDate(p.actualDelivery)) : "",
    p.deliveryType ? detailRow("Delivery type", p.deliveryType) : "",
    p.deliveryAddress ? detailRow("Delivery address", p.deliveryAddress) : ""
  ].filter(Boolean).join("");
  const portalBlock = portalUrl ? `${sectionTitle("View your order")}
       <div style="margin-top:12px;text-align:center;">
         <a href="${portalUrl}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">View order status</a>
       </div>` : "";
  const headline = isComplete ? "Your order was delivered" : "Partial delivery recorded";
  const bodyCopy = isComplete ? `Your order <strong>${esc(p.orderNumber)}</strong> has been <strong>delivered</strong>. Thank you for choosing Lamtex. Your sales agent can help with any follow-up questions.` : `A <strong>partial delivery</strong> was recorded for your order <strong>${esc(p.orderNumber)}</strong>. Remaining items will be fulfilled separately. Your sales agent can provide more details.`;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="background:linear-gradient(135deg,#059669,#047857);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">${headline}</h1>
            <p style="margin:8px 0 0;color:#d1fae5;font-size:14px;">${esc(p.orderNumber)} \xB7 ${esc(p.branchName ?? "Lamtex")}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 8px;color:#111827;font-size:15px;line-height:1.55;">Hello ${esc(greetingName)},</p>
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">${bodyCopy}</p>
            ${infoCard("Delivery details", orderSummaryRows, `${p.orderNumber} \xB7 customer \xB7 delivery`, { hideMeta: true })}
            ${agentContactCard(p.agent, p.orderNumber)}
            ${portalBlock}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex \xB7 Order notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// server/email/orderCustomerPaymentRecordedEmail.ts
function manualRecordingNotice() {
  return `<div style="margin:20px 0 16px;padding:16px 18px;background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;">
    <p style="margin:0 0 8px;color:#92400e;font-size:14px;font-weight:700;line-height:1.45;">Manual payment recording</p>
    <p style="margin:0;color:#78350f;font-size:14px;line-height:1.55;">
      Payment amounts shown here are entered manually by our team. If anything does not match your records,
      please contact your sales agent below to resolve any discrepancy.
    </p>
  </div>`;
}
function agentContactBlock(agent, orderNumber) {
  return agentContactCard(agent, orderNumber).replace("margin-bottom:16px", "margin-bottom:0");
}
function paidInFullBanner() {
  return `<div style="margin:0 0 20px;padding:20px 22px;background:linear-gradient(135deg,#ecfdf5 0%,#fef3c7 100%);border:1px solid #6ee7b7;border-radius:12px;text-align:center;">
    <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#047857;text-transform:uppercase;letter-spacing:.08em;">Fully settled</p>
    <p style="margin:0;font-size:16px;font-weight:600;color:#065f46;line-height:1.45;">Your order is paid in full. Thank you for your business with Lamtex.</p>
  </div>`;
}
function buildOrderCustomerPaymentRecordedEmailHtml(p) {
  const greetingName = p.customerContactPerson?.trim() || p.customerName?.trim() || "Valued customer";
  const portalUrl = customerPortalUrl(p);
  const isPaid = isOrderFullyPaid(p.balanceDue, p.paymentStatus);
  const orderSummaryRows = [
    detailRow("Order number", p.orderNumber),
    detailRow(
      "Payment status",
      isPaid ? "Paid in full" : p.paymentStatus,
      badge(isPaid ? "Paid" : p.paymentStatus, statusBadgeStyle(isPaid ? "Paid" : p.paymentStatus))
    ),
    detailRow("Order total", peso(p.totalAmount)),
    detailRow("This payment", peso(p.paymentAmount)),
    p.paymentCash > 0 ? detailRow("Cash / transfer / cheque", peso(p.paymentCash)) : "",
    p.paymentCredit > 0 ? detailRow("Customer credit applied", peso(p.paymentCredit)) : "",
    detailRow("Total paid to date", peso(p.amountPaid)),
    isPaid ? detailRow(
      "Balance due",
      "Fully paid",
      `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#d1fae5;color:#047857;font-size:13px;font-weight:700;">Fully settled</span>`
    ) : detailRow("Balance due", peso(p.balanceDue))
  ].filter(Boolean).join("");
  const portalBlock = portalUrl ? `<div style="margin-top:20px;padding-top:20px;border-top:1px solid #e5e7eb;">
         ${sectionTitle("View your order")}
         <div style="margin-top:10px;text-align:center;">
           <a href="${portalUrl}" style="display:inline-block;background:${isPaid ? "#047857" : "#059669"};color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">${isPaid ? "View your completed order" : "View order &amp; payment status"}</a>
         </div>
       </div>` : "";
  const headerGradient = isPaid ? "background:linear-gradient(135deg,#b45309 0%,#059669 55%,#047857 100%);" : "background:linear-gradient(135deg,#059669,#047857);";
  const headerSubColor = isPaid ? "color:#fef3c7;" : "color:#d1fae5;";
  const headline = isPaid ? "Order paid in full" : "Payment received on your order";
  const headerSub = isPaid ? `${esc(p.orderNumber)} \xB7 Fully settled \xB7 ${esc(p.branchName ?? "Lamtex")}` : `${esc(p.orderNumber)} \xB7 ${esc(p.branchName ?? "Lamtex")}`;
  const bodyCopy = isPaid ? `We received your final payment of <strong>${peso(p.paymentAmount)}</strong> on order <strong>${esc(p.orderNumber)}</strong>. Your account for this order is now <strong>fully settled</strong>.` : `We recorded a payment of <strong>${peso(p.paymentAmount)}</strong> on order <strong>${esc(p.orderNumber)}</strong>. Your remaining balance is <strong>${peso(p.balanceDue)}</strong>.`;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="${headerGradient}padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">${headline}</h1>
            <p style="margin:8px 0 0;${headerSubColor}font-size:14px;">${headerSub}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 8px;color:#111827;font-size:15px;line-height:1.55;">Hello ${esc(greetingName)},</p>
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">${bodyCopy}</p>
            ${isPaid ? paidInFullBanner() : ""}
            ${infoCard(isPaid ? "Payment complete" : "Payment summary", orderSummaryRows, `${p.orderNumber} \xB7 customer \xB7 payment`, { hideMeta: true })}
            ${manualRecordingNotice()}
            <div style="margin-bottom:4px;">${agentContactBlock(p.agent, p.orderNumber)}</div>
            ${portalBlock}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex \xB7 Order notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// server/email/orderCustomerScheduledEmail.ts
function buildOrderCustomerScheduledEmailHtml(p) {
  const greetingName = p.customerContactPerson?.trim() || p.customerName?.trim() || "Valued customer";
  const scheduleDate = p.scheduledDate?.trim() || "\u2014";
  const portalUrl = customerPortalUrl(p);
  const orderSummaryRows = [
    detailRow("Order number", p.orderNumber),
    detailRow("Status", "Scheduled", badge("Scheduled", statusBadgeStyle("Scheduled"))),
    detailRow("Planned dispatch date", formatDate(scheduleDate)),
    p.tripNumber?.trim() ? detailRow("Reference", p.tripNumber.trim()) : "",
    detailRow("Required delivery", formatDate(p.requiredDate)),
    p.deliveryType ? detailRow("Delivery type", p.deliveryType) : "",
    p.deliveryAddress ? detailRow("Delivery address", p.deliveryAddress) : ""
  ].filter(Boolean).join("");
  const portalBlock = portalUrl ? `${sectionTitle("View your order online")}
       <div style="margin-top:12px;text-align:center;">
         <a href="${portalUrl}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">View order status</a>
       </div>` : "";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Your order is scheduled</h1>
            <p style="margin:8px 0 0;color:#dbeafe;font-size:14px;">${esc(p.orderNumber)} \xB7 ${esc(p.branchName ?? "Lamtex")}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 8px;color:#111827;font-size:15px;line-height:1.55;">Hello ${esc(greetingName)},</p>
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">
              Your order <strong>${esc(p.orderNumber)}</strong> has been scheduled for dispatch on
              <strong>${esc(formatDate(scheduleDate))}</strong>. Our team will prepare your items for that date.
              Your sales agent can help if you have questions about timing or delivery.
            </p>
            ${infoCard("Schedule details", orderSummaryRows, `${p.orderNumber} \xB7 customer \xB7 scheduled`, { hideMeta: true })}
            ${agentContactCard(p.agent, p.orderNumber)}
            ${portalBlock}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex \xB7 Order notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// server/email/orderCustomerUnscheduledEmail.ts
function buildOrderCustomerUnscheduledEmailHtml(p) {
  const greetingName = p.customerContactPerson?.trim() || p.customerName?.trim() || "Valued customer";
  const previousDate = p.previousScheduledDate?.trim();
  const portalUrl = customerPortalUrl(p);
  const orderSummaryRows = [
    detailRow("Order number", p.orderNumber),
    detailRow("Status", "Approved", badge("Approved", statusBadgeStyle("Approved"))),
    previousDate ? detailRow("Previous planned dispatch", formatDate(previousDate)) : "",
    detailRow("Required delivery", formatDate(p.requiredDate)),
    p.deliveryType ? detailRow("Delivery type", p.deliveryType) : "",
    p.deliveryAddress ? detailRow("Delivery address", p.deliveryAddress) : ""
  ].filter(Boolean).join("");
  const previousDateNote = previousDate ? `<p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.55;">
         The previously planned dispatch date was <strong>${esc(formatDate(previousDate))}</strong>.
       </p>` : "";
  const portalBlock = portalUrl ? `${sectionTitle("View your order online")}
       <div style="margin-top:12px;text-align:center;">
         <a href="${portalUrl}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">View order status</a>
       </div>` : "";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1,#4f46e5);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Update on your delivery schedule</h1>
            <p style="margin:8px 0 0;color:#e0e7ff;font-size:14px;">${esc(p.orderNumber)} \xB7 ${esc(p.branchName ?? "Lamtex")}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 8px;color:#111827;font-size:15px;line-height:1.55;">Hello ${esc(greetingName)},</p>
            <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.55;">
              Your order <strong>${esc(p.orderNumber)}</strong> is no longer on its previously planned delivery route.
              Our logistics team is working to assign a new dispatch date and will confirm it as soon as it is set.
            </p>
            ${previousDateNote}
            <p style="margin:0 0 20px;color:#374151;font-size:14px;line-height:1.55;">
              This update does not necessarily mean your order is delayed \u2014 we are adjusting the schedule and will keep you informed.
            </p>
            ${infoCard("Order details", orderSummaryRows, `${p.orderNumber} \xB7 customer \xB7 schedule update`, { hideMeta: true })}
            ${agentContactCard(p.agent, p.orderNumber)}
            ${portalBlock}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex \xB7 Order notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// server/email/orderCustomerPortalShareEmail.ts
function buildOrderCustomerPortalShareEmailHtml(p) {
  const greetingName = p.customerContactPerson?.trim() || p.customerName?.trim() || "Valued customer";
  const portalUrl = customerPortalUrl(p);
  const orderSummaryRows = [
    detailRow("Order number", p.orderNumber),
    detailRow("Status", p.status, badge(p.status, statusBadgeStyle(p.status))),
    detailRow("Order date", formatDate(p.orderDate)),
    detailRow("Required delivery", formatDate(p.requiredDate)),
    detailRow("Order total", peso(p.totalAmount)),
    p.deliveryAddress ? detailRow("Delivery address", p.deliveryAddress) : ""
  ].filter(Boolean).join("");
  const portalBlock = portalUrl ? `${sectionTitle("View your order online")}
       <div style="margin-top:12px;text-align:center;">
         <a href="${portalUrl}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">View order status</a>
       </div>
       <p style="margin:16px 0 0;color:#6b7280;font-size:13px;line-height:1.5;text-align:center;">
         Or copy this link into your browser:<br>
         <a href="${portalUrl}" style="color:#047857;word-break:break-all;">${esc(portalUrl)}</a>
       </p>` : `<p style="margin:16px 0 0;color:#6b7280;font-size:13px;line-height:1.5;">Your order link could not be generated. Please contact your sales agent for assistance.</p>`;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="background:linear-gradient(135deg,#059669,#047857);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Your order is ready to view online</h1>
            <p style="margin:8px 0 0;color:#d1fae5;font-size:14px;">${esc(p.orderNumber)} \xB7 ${esc(p.branchName ?? "Lamtex")}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 8px;color:#111827;font-size:15px;line-height:1.55;">Hello ${esc(greetingName)},</p>
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">
              Here is a secure link to view the status and details of your order
              <strong>${esc(p.orderNumber)}</strong>. You can track progress, review line items, and see delivery updates at any time.
            </p>
            ${infoCard("Order summary", orderSummaryRows, `${p.orderNumber} \xB7 customer \xB7 summary`, { hideMeta: true })}
            ${agentContactCard(p.agent, p.orderNumber)}
            ${portalBlock}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex \xB7 Order notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// server/email/orderDeliveryProofUploadedEmail.ts
function orderUrl4(orderId) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  return `${appUrl.replace(/\/$/, "")}/orders/${orderId}`;
}
function buildOrderDeliveryProofUploadedEmailHtml(p) {
  const lineCount = p.lineCount ?? p.items.length;
  const uploadedLabel = p.uploadedBy?.trim() || "Staff";
  const isOther = p.proofType === "other";
  const isPayment = p.proofType === "payment";
  const paidInFull = isPayment && p.amountPaid != null && p.balanceDue != null && isOrderFullyPaid(p.balanceDue, p.paymentStatus);
  const paymentTotal = (p.paymentCash ?? 0) + (p.paymentCredit ?? 0);
  const proofLabel = isPayment ? p.proofCount <= 1 ? "1 payment proof file" : `${p.proofCount} payment proof files` : isOther ? p.proofCount <= 1 ? "1 other document" : `${p.proofCount} other documents` : p.proofCount <= 1 ? "1 delivery proof file" : `${p.proofCount} delivery proof files`;
  const headerTitle = paidInFull ? "Order paid in full" : isPayment ? "Payment proof uploaded" : isOther ? "Other document uploaded" : "Delivery proof uploaded";
  const headerGradient = paidInFull ? "background:linear-gradient(135deg,#b45309 0%,#059669 55%,#047857 100%);" : isPayment ? "background:linear-gradient(135deg,#059669,#047857);" : isOther ? "background:linear-gradient(135deg,#d97706,#b45309);" : "background:linear-gradient(135deg,#4f46e5,#4338ca);";
  const headerSubColor = paidInFull ? "color:#fef3c7;" : isPayment ? "color:#d1fae5;" : isOther ? "color:#fef3c7;" : "color:#e0e7ff;";
  const ctaColor = paidInFull ? "#047857" : isPayment ? "#059669" : isOther ? "#d97706" : "#4f46e5";
  const ctaLabel3 = paidInFull ? "View completed order" : isPayment ? "View order &amp; payment proof" : isOther ? "View order &amp; document" : "View order &amp; proof";
  const proofTitle = p.proofTitle?.trim() || null;
  const proofNotes = p.proofNotes?.trim() || null;
  const orderSummaryRows = [
    detailRow("Order number", p.orderNumber),
    detailRow("Status", p.status, badge(p.status, statusBadgeStyle(p.status))),
    detailRow("Customer", p.customerName ?? "\u2014"),
    detailRow("Branch", p.branchName ?? "\u2014"),
    detailRow("Required delivery", formatDate(p.requiredDate)),
    detailRow("Line items", String(lineCount)),
    detailRow("Order total", peso(p.totalAmount)),
    detailRow("Uploaded by", uploadedLabel),
    detailRow("Proof files", String(p.proofCount)),
    isPayment && paymentTotal > 0 ? detailRow("Payment recorded", peso(paymentTotal)) : "",
    isPayment && (p.paymentCash ?? 0) > 0 ? detailRow("Cash / transfer / cheque", peso(p.paymentCash ?? 0)) : "",
    isPayment && (p.paymentCredit ?? 0) > 0 ? detailRow("Customer credit", peso(p.paymentCredit ?? 0)) : "",
    paidInFull ? detailRow(
      "Balance due",
      "Fully paid",
      `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#d1fae5;color:#047857;font-size:13px;font-weight:700;">Fully settled</span>`
    ) : isPayment && p.balanceDue != null ? detailRow("Balance due", peso(p.balanceDue)) : ""
  ].filter(Boolean).join("");
  const proofDetailRows = [
    detailRow("Title / purpose", proofTitle ?? "\u2014"),
    proofNotes ? detailRow(
      "Notes",
      proofNotes,
      `<p style="margin:0;color:#374151;font-size:14px;line-height:1.55;white-space:pre-wrap;">${esc(proofNotes)}</p>`
    ) : detailRow("Notes", "\u2014")
  ].filter(Boolean).join("");
  const logisticsRows = isOther || isPayment ? "" : [
    p.deliveryType ? detailRow("Delivery type", p.deliveryType) : "",
    p.deliveryAddress ? detailRow("Delivery address", p.deliveryAddress) : ""
  ].filter(Boolean).join("");
  const introCopy = paidInFull ? `Order <strong>${esc(p.orderNumber)}</strong> for <strong>${esc(p.customerName ?? "your customer")}</strong> is now <strong>fully paid</strong>. A final payment of <strong>${peso(paymentTotal)}</strong> was recorded by ${esc(uploadedLabel)}.` : `${esc(proofLabel)} ${proofLabel.includes("1") ? "was" : "were"} added to order
              <strong>${esc(p.orderNumber)}</strong> for your customer
              <strong>${esc(p.customerName ?? "the customer")}</strong> by ${esc(uploadedLabel)}.`;
  const paidInFullBanner3 = paidInFull ? `<div style="margin:0 0 20px;padding:16px 18px;background:linear-gradient(135deg,#ecfdf5,#fef9c3);border:1px solid #6ee7b7;border-radius:10px;">
         <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#047857;text-transform:uppercase;letter-spacing:.08em;">Payment complete</p>
         <p style="margin:0;color:#065f46;font-size:15px;line-height:1.55;">This payment clears the order balance for ${esc(p.customerName ?? "this customer")}.</p>
       </div>` : "";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="${headerGradient}padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">${headerTitle}</h1>
            <p style="margin:8px 0 0;${headerSubColor}font-size:14px;">${esc(p.orderNumber)} \xB7 ${paidInFull ? "Fully settled \xB7 " : ""}${esc(p.branchName ?? "Lamtex")}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">${introCopy}</p>
            ${paidInFullBanner3}
            ${infoCard(paidInFull ? "Payment complete" : "Order summary", orderSummaryRows, `${p.orderNumber} \xB7 agent \xB7 ${isPayment ? "payment proof" : isOther ? "other document" : "delivery proof"}`, { hideMeta: true })}
            ${sectionTitle("Document details")}
            ${infoCard("", proofDetailRows, "", { hideMeta: true })}
            ${logisticsRows ? sectionTitle("Delivery details") + infoCard("", logisticsRows, "", { hideMeta: true }) : ""}
            <div style="margin-top:24px;text-align:center;">
              <a href="${orderUrl4(p.orderId)}" style="display:inline-block;background:${ctaColor};color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;">${ctaLabel3}</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex \xB7 Order notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// server/email/orderPaymentRecordedEmail.ts
function orderUrl5(orderId) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  return `${appUrl.replace(/\/$/, "")}/orders/${orderId}`;
}
function paidInFullBanner2() {
  return `<div style="margin:0 0 20px;padding:16px 18px;background:linear-gradient(135deg,#ecfdf5,#fef9c3);border:1px solid #6ee7b7;border-radius:10px;">
    <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#047857;text-transform:uppercase;letter-spacing:.08em;">Payment complete</p>
    <p style="margin:0;color:#065f46;font-size:15px;line-height:1.55;">This payment clears the order balance \u2014 the order is now <strong>fully paid</strong>.</p>
  </div>`;
}
function buildOrderPaymentRecordedEmailHtml(p) {
  const lineCount = p.lineCount ?? p.items.length;
  const recordedLabel = p.recordedBy?.trim() || "Staff";
  const isPaid = isOrderFullyPaid(p.balanceDue, p.paymentStatus);
  const orderSummaryRows = [
    detailRow("Order number", p.orderNumber),
    detailRow("Status", p.status, badge(p.status, statusBadgeStyle(p.status))),
    detailRow("Customer", p.customerName ?? "\u2014"),
    detailRow("Sales agent", p.agentName ?? "\u2014"),
    detailRow("Branch", p.branchName ?? "\u2014"),
    detailRow("Required delivery", formatDate(p.requiredDate)),
    detailRow("Line items", String(lineCount)),
    detailRow("Order total", peso(p.totalAmount)),
    detailRow("Recorded by", recordedLabel)
  ].filter(Boolean).join("");
  const paymentRows = [
    detailRow("This payment", peso(p.paymentAmount)),
    detailRow("Cash / transfer / cheque", peso(p.paymentCash)),
    detailRow("Customer credit", peso(p.paymentCredit)),
    detailRow("Total paid (order)", peso(p.amountPaid)),
    isPaid ? detailRow(
      "Balance due",
      "Fully paid",
      `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#d1fae5;color:#047857;font-size:13px;font-weight:700;">Fully settled</span>`
    ) : detailRow("Balance due", peso(p.balanceDue)),
    detailRow(
      "Payment status",
      isPaid ? "Paid in full" : p.paymentStatus ?? "\u2014",
      badge(isPaid ? "Paid" : p.paymentStatus ?? "\u2014", statusBadgeStyle(isPaid ? "Paid" : p.paymentStatus))
    )
  ].filter(Boolean).join("");
  const headerGradient = isPaid ? "background:linear-gradient(135deg,#b45309 0%,#059669 55%,#047857 100%);" : "background:linear-gradient(135deg,#059669,#047857);";
  const headerSubColor = isPaid ? "color:#fef3c7;" : "color:#d1fae5;";
  const headline = isPaid ? "Order paid in full" : "Payment received";
  const intro = isPaid ? `Order <strong>${esc(p.orderNumber)}</strong> for <strong>${esc(p.customerName ?? "the customer")}</strong> is now <strong>fully paid</strong>. A final payment of <strong>${peso(p.paymentAmount)}</strong> was recorded by ${esc(recordedLabel)}.` : `A payment of <strong>${peso(p.paymentAmount)}</strong> was recorded on order <strong>${esc(p.orderNumber)}</strong> for <strong>${esc(p.customerName ?? "the customer")}</strong> by ${esc(recordedLabel)}.`;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="${headerGradient}padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">${headline}</h1>
            <p style="margin:8px 0 0;${headerSubColor}font-size:14px;">${esc(p.orderNumber)} \xB7 ${esc(p.branchName ?? "Lamtex")}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">${intro}</p>
            ${isPaid ? paidInFullBanner2() : ""}
            ${infoCard("Order summary", orderSummaryRows, `${p.orderNumber} \xB7 payment`, { hideMeta: true })}
            ${sectionTitle(isPaid ? "Final payment details" : "Payment details")}
            ${infoCard("", paymentRows, "", { hideMeta: true })}
            <div style="margin-top:24px;text-align:center;">
              <a href="${orderUrl5(p.orderId)}" style="display:inline-block;background:${isPaid ? "#047857" : "#059669"};color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;">View order</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex \xB7 Order notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// server/email/orderPaymentOverdueEmail.ts
function orderUrl6(orderId) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  return `${appUrl.replace(/\/$/, "")}/orders/${orderId}`;
}
function buildOrderPaymentOverdueEmailHtml(p) {
  const target = p.notifyTarget;
  const lineCount = p.lineCount ?? p.items.length;
  const daysLabel = p.daysOverdue === 1 ? "1 day" : `${p.daysOverdue} days`;
  const headerStyles = {
    executive: {
      bg: "background:linear-gradient(135deg,#b91c1c,#991b1b);",
      sub: "color:#fecaca;",
      title: "Order payment overdue"
    },
    agent: {
      bg: "background:linear-gradient(135deg,#c2410c,#9a3412);",
      sub: "color:#ffedd5;",
      title: "Customer payment overdue"
    }
  }[target];
  const intro = target === "executive" ? `Order <strong>${esc(p.orderNumber)}</strong> for <strong>${esc(p.customerName ?? "the customer")}</strong> is <strong>${esc(daysLabel)} past payment terms</strong> with <strong>${peso(p.balanceDue)}</strong> still outstanding.` : `Your customer order <strong>${esc(p.orderNumber)}</strong> for <strong>${esc(p.customerName ?? "the customer")}</strong> is <strong>${esc(daysLabel)} past payment terms</strong>. Outstanding balance: <strong>${peso(p.balanceDue)}</strong>.`;
  const orderSummaryRows = [
    detailRow("Order number", p.orderNumber),
    detailRow("Status", p.status, badge(p.status, statusBadgeStyle(p.status))),
    detailRow("Customer", p.customerName ?? "\u2014"),
    detailRow("Sales agent", p.agentName ?? "\u2014"),
    detailRow("Branch", p.branchName ?? "\u2014"),
    detailRow("Payment terms", p.paymentTerms ?? "\u2014"),
    detailRow("Due date", formatDate(p.dueDate)),
    detailRow("Days overdue", daysLabel),
    detailRow("Order total", peso(p.totalAmount)),
    detailRow("Amount paid", peso(p.amountPaid)),
    detailRow(
      "Balance due",
      peso(p.balanceDue),
      `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#fee2e2;color:#991b1b;font-size:13px;font-weight:700;">Overdue</span>`
    ),
    detailRow(
      "Payment status",
      p.paymentStatus ?? "Overdue",
      badge(p.paymentStatus ?? "Overdue", statusBadgeStyle("Overdue"))
    ),
    detailRow("Line items", String(lineCount))
  ].filter(Boolean).join("");
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="${headerStyles.bg}padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">${headerStyles.title}</h1>
            <p style="margin:8px 0 0;${headerStyles.sub}font-size:14px;">${esc(p.orderNumber)} \xB7 ${esc(p.branchName ?? "Branch")}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.orderNumber, "Payment overdue")}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">${intro}</p>
            ${infoCard("Overdue order summary", orderSummaryRows, `${p.orderNumber} \xB7 payment overdue \xB7 summary`)}
            ${sectionTitle("Products ordered", `${p.orderNumber} \xB7 ${lineCount} line(s)`)}
            <div style="margin-top:28px;text-align:center;">
              <a href="${orderUrl6(p.orderId)}" style="display:inline-block;background:#b91c1c;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">View order</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex ERP \xB7 Automated notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// server/email/orderCustomerPaymentOverdueEmail.ts
function buildOrderCustomerPaymentOverdueEmailHtml(p) {
  const greetingName = p.customerContactPerson?.trim() || p.customerName?.trim() || "Valued customer";
  const portalUrl = customerPortalUrl(p);
  const daysLabel = p.daysOverdue === 1 ? "1 day" : `${p.daysOverdue} days`;
  const orderSummaryRows = [
    detailRow("Order number", p.orderNumber),
    detailRow(
      "Payment status",
      "Overdue",
      badge("Overdue", statusBadgeStyle("Overdue"))
    ),
    detailRow("Payment terms", p.paymentTerms ?? "\u2014"),
    detailRow("Due date", formatDate(p.dueDate)),
    detailRow("Days overdue", daysLabel),
    detailRow("Order total", peso(p.totalAmount)),
    detailRow("Amount paid to date", peso(p.amountPaid)),
    detailRow(
      "Balance due",
      peso(p.balanceDue),
      `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#fee2e2;color:#991b1b;font-size:13px;font-weight:700;">Past due</span>`
    )
  ].filter(Boolean).join("");
  const portalBlock = portalUrl ? `<div style="margin-top:20px;padding-top:20px;border-top:1px solid #e5e7eb;">
         ${sectionTitle("View your order")}
         <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.55;">You can review order details and payment history on your customer portal.</p>
         <div style="text-align:center;">
           <a href="${portalUrl}" style="display:inline-block;background:#b91c1c;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">Open customer portal</a>
         </div>
       </div>` : "";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="background:linear-gradient(135deg,#b91c1c,#991b1b);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Payment reminder</h1>
            <p style="margin:8px 0 0;color:#fecaca;font-size:14px;">Order ${esc(p.orderNumber)} \xB7 past payment terms</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.55;">Dear ${esc(greetingName)},</p>
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">
              This is a reminder that payment for order <strong>${esc(p.orderNumber)}</strong> is now
              <strong>${esc(daysLabel)} past the agreed payment terms</strong>.
              The outstanding balance is <strong>${peso(p.balanceDue)}</strong>.
              Please arrange payment at your earliest convenience.
            </p>
            ${infoCard("Order summary", orderSummaryRows, `${p.orderNumber} \xB7 customer \xB7 overdue`)}
            ${portalBlock}
            <div style="margin-top:24px;padding-top:20px;border-top:1px solid #e5e7eb;">
              ${sectionTitle("Your sales agent")}
              ${agentContactCard(p.agent, p.orderNumber)}
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex \xB7 Payment reminder
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// server/email/orderCommissionPaidAgentEmail.ts
function orderUrl7(orderId) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  return `${appUrl.replace(/\/$/, "")}/orders/${orderId}`;
}
function buildOrderCommissionPaidAgentEmailHtml(p) {
  const paidLabel = p.paidBy?.trim() || "Finance";
  const isBulk = (p.proofCount ?? 1) > 1;
  const headline = isBulk ? "Commissions paid out" : "Commission paid out";
  const intro = isBulk ? `Commission totaling <strong>${peso(p.commissionAmount)}</strong> was released for <strong>${p.proofCount}</strong> cash payment proof(s) on order <strong>${esc(p.orderNumber)}</strong> for <strong>${esc(p.customerName ?? "your customer")}</strong> by ${esc(paidLabel)}.` : `Commission of <strong>${peso(p.commissionAmount)}</strong> was released for a cash payment of <strong>${peso(p.cashAmount)}</strong> on order <strong>${esc(p.orderNumber)}</strong> for <strong>${esc(p.customerName ?? "your customer")}</strong> by ${esc(paidLabel)}.`;
  const summaryRows = [
    detailRow("Order number", p.orderNumber),
    detailRow("Customer", p.customerName ?? "\u2014"),
    detailRow("Branch", p.branchName ?? "\u2014"),
    detailRow("Payment proofs", String(p.proofCount ?? 1)),
    detailRow("Cash payments", peso(p.cashAmount)),
    detailRow("Commission paid out", peso(p.commissionAmount)),
    detailRow("Released by", paidLabel),
    p.paymentStatus ? detailRow("Payment status", p.paymentStatus, badge(p.paymentStatus, statusBadgeStyle(p.paymentStatus))) : ""
  ].filter(Boolean).join("");
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">${headline}</h1>
            <p style="margin:8px 0 0;color:#dbeafe;font-size:14px;">${esc(p.orderNumber)} \xB7 ${esc(p.branchName ?? "Lamtex")}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">${intro}</p>
            ${sectionTitle("Payout summary")}
            ${infoCard("", summaryRows, `${p.orderNumber} \xB7 agent \xB7 commission`, { hideMeta: true })}
            <div style="margin-top:24px;text-align:center;">
              <a href="${orderUrl7(p.orderId)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;">View order</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex \xB7 Order notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// server/email/orderScheduledEmail.ts
function orderUrl8(orderId) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  return `${appUrl.replace(/\/$/, "")}/orders/${orderId}`;
}
function buildOrderScheduledEmailHtml(p) {
  const target = p.notifyTarget;
  const lineCount = p.lineCount ?? p.items.length;
  const scheduledLabel = p.scheduledBy?.trim() || "Logistics";
  const scheduleDate = p.scheduledDate?.trim() || p.requiredDate || "\u2014";
  const tripLabel = p.tripNumber?.trim() || "\u2014";
  const vehicleLabel = p.vehicleName?.trim() || "\u2014";
  const driverLabel = p.driverName?.trim() || "\u2014";
  const headerStyles = {
    executive: {
      bg: "background:linear-gradient(135deg,#0f766e,#115e59);",
      sub: "color:#ccfbf1;",
      title: "Order scheduled"
    },
    warehouse: {
      bg: "background:linear-gradient(135deg,#d97706,#b45309);",
      sub: "color:#fef3c7;",
      title: "Order scheduled \u2014 prepare for loading"
    },
    agent: {
      bg: "background:linear-gradient(135deg,#4f46e5,#4338ca);",
      sub: "color:#e0e7ff;",
      title: "Your customer order was scheduled"
    }
  }[target];
  const intro = target === "executive" ? `Order <strong>${esc(p.orderNumber)}</strong> for <strong>${esc(p.customerName ?? "the customer")}</strong> was scheduled by ${esc(scheduledLabel)}. Trip and schedule details are below.` : target === "warehouse" ? `Order <strong>${esc(p.orderNumber)}</strong> for <strong>${esc(p.customerName ?? "the customer")}</strong> is scheduled for <strong>${esc(formatDate(scheduleDate))}</strong>. Prepare items for loading at ${esc(p.branchName ?? "your branch")}.` : `Order <strong>${esc(p.orderNumber)}</strong> for your customer <strong>${esc(p.customerName ?? "the customer")}</strong> has been scheduled for delivery on <strong>${esc(formatDate(scheduleDate))}</strong>.`;
  const orderSummaryRows = [
    detailRow("Order number", p.orderNumber),
    detailRow("Status", p.status, badge(p.status, statusBadgeStyle(p.status))),
    detailRow("Customer", p.customerName ?? "\u2014"),
    detailRow("Sales agent", p.agentName ?? "\u2014"),
    detailRow("Branch", p.branchName ?? "\u2014"),
    detailRow("Scheduled date", formatDate(scheduleDate)),
    detailRow("Trip / shipment", tripLabel),
    detailRow("Vehicle / container", vehicleLabel),
    p.driverName?.trim() ? detailRow("Driver", driverLabel) : "",
    detailRow("Required delivery", formatDate(p.requiredDate)),
    detailRow("Urgency", p.urgency ?? "Medium", badge(p.urgency ?? "Medium", urgencyBadgeStyle(p.urgency))),
    detailRow("Line items", String(lineCount)),
    detailRow("Order total", peso(p.totalAmount)),
    target === "executive" ? detailRow("Scheduled by", scheduledLabel) : ""
  ].filter(Boolean).join("");
  const logisticsRows = [
    p.deliveryType ? detailRow("Delivery type", p.deliveryType) : "",
    p.deliveryAddress ? detailRow("Delivery address", p.deliveryAddress) : "",
    p.paymentTerms ? detailRow("Payment terms", p.paymentTerms) : ""
  ].filter(Boolean).join("");
  const notesBlock = p.orderNotes?.trim() ? infoCard("Order notes", detailRow("Notes", p.orderNotes.trim()), `${p.orderNumber} \xB7 scheduled \xB7 notes`) : "";
  const ctaLabel3 = target === "warehouse" ? "View order" : "Open order";
  const url = orderUrl8(p.orderId);
  const refLabel = target === "executive" ? "Scheduled" : target === "warehouse" ? "Prepare for loading" : "Scheduled for customer";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="${headerStyles.bg}padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">${headerStyles.title}</h1>
            <p style="margin:8px 0 0;${headerStyles.sub}font-size:14px;">${esc(p.orderNumber)} \xB7 ${esc(p.branchName ?? "Branch")}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.orderNumber, refLabel)}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">${intro}</p>
            ${infoCard("Order summary", orderSummaryRows, `${p.orderNumber} \xB7 scheduled \xB7 summary`)}
            ${logisticsRows ? infoCard("Delivery & payment", logisticsRows, `${p.orderNumber} \xB7 scheduled \xB7 delivery`) : ""}
            ${notesBlock}
            ${sectionTitle("Next step", `${p.orderNumber} \xB7 scheduled`)}
            <div style="text-align:center;margin-top:8px;">
              <a href="${url}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">${ctaLabel3}</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex \xB7 Automated notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// server/email/tripDriverAssignedEmail.ts
function driverDashboardUrl() {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  return `${appUrl.replace(/\/$/, "")}/`;
}
function buildTripDriverAssignedEmailHtml(p) {
  const scheduleDate = p.scheduledDate?.trim() || "\u2014";
  const assignedLabel = p.assignedBy?.trim() || "Logistics";
  const driverLabel = p.driverName?.trim() || "Driver";
  const isIbr = Boolean(p.interBranchRequestId || p.ibrNumber);
  const refLabel = isIbr ? p.ibrNumber?.trim() || p.tripNumber : p.tripNumber;
  const headline = isIbr ? "Inter-branch shipment assigned to you" : "New trip assigned to you";
  const subline = isIbr ? `${esc(refLabel)} \xB7 ${esc(p.destinationLabel ?? "Inter-branch delivery")}` : `${esc(p.tripNumber)} \xB7 ${esc(p.branchName ?? "Lamtex")}`;
  const tripSummaryRows = isIbr ? [
    detailRow("Request", p.ibrNumber ?? p.tripNumber),
    detailRow("Scheduled date", formatDate(scheduleDate)),
    detailRow("Deliver to", p.destinationLabel ?? "\u2014"),
    detailRow("Truck", p.vehicleName ?? "\u2014"),
    detailRow("Driver", p.driverName ?? "\u2014"),
    detailRow("Branch", p.branchName ?? "\u2014"),
    detailRow("Assigned by", assignedLabel)
  ].join("") : [
    detailRow("Trip number", p.tripNumber),
    detailRow("Scheduled date", formatDate(scheduleDate)),
    detailRow("Vehicle", p.vehicleName ?? "\u2014"),
    detailRow("Branch", p.branchName ?? "\u2014"),
    detailRow("Orders on trip", String(p.orderCount)),
    detailRow("Assigned by", assignedLabel)
  ].join("");
  const introText = isIbr ? `Hello ${esc(driverLabel)}, you have been assigned to inter-branch shipment <strong>${esc(refLabel)}</strong>
              scheduled for <strong>${esc(formatDate(scheduleDate))}</strong>, delivering to
              <strong>${esc(p.destinationLabel ?? "the requesting branch")}</strong> on truck
              <strong>${esc(p.vehicleName ?? "TBD")}</strong> with driver
              <strong>${esc(p.driverName ?? driverLabel)}</strong>.` : `Hello ${esc(driverLabel)}, you have been assigned to trip <strong>${esc(p.tripNumber)}</strong>
              scheduled for <strong>${esc(formatDate(scheduleDate))}</strong> on vehicle
              <strong>${esc(p.vehicleName ?? "TBD")}</strong>.`;
  const orderList = p.orderNumbers.length > 0 ? p.orderNumbers.map((n) => `<li style="margin:4px 0;color:#374151;">${esc(n)}</li>`).join("") : '<li style="color:#6b7280;">No orders listed</li>';
  const detailSection = isIbr ? `${infoCard("Shipment summary", tripSummaryRows, `${refLabel} \xB7 driver assignment`)}` : `${infoCard("Trip summary", tripSummaryRows, `${p.tripNumber} \xB7 driver assignment`)}
            ${sectionTitle("Orders on this trip", p.tripNumber)}
            <ul style="margin:0 0 20px;padding-left:20px;font-size:14px;line-height:1.5;">${orderList}</ul>`;
  const dashboardUrl = driverDashboardUrl();
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a8a,#1d4ed8);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">${headline}</h1>
            <p style="margin:8px 0 0;color:#bfdbfe;font-size:14px;">${subline}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(refLabel, isIbr ? "Inter-branch assignment" : "Trip assignment")}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">
              ${introText}
            </p>
            ${detailSection}
            <div style="text-align:center;">
              <a href="${dashboardUrl}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">Open driver dashboard</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex \xB7 Driver notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// server/email/productStockAlertEmail.ts
function severityLabel(s) {
  switch (s) {
    case "out_of_stock":
      return "Out of stock";
    case "critical":
      return "Critical stock";
    case "low_stock":
    default:
      return "Below reorder point";
  }
}
function severityHeaderGradient(s) {
  if (s === "out_of_stock" || s === "critical") {
    return "linear-gradient(135deg,#991b1b,#b91c1c)";
  }
  return "linear-gradient(135deg,#b45309,#d97706)";
}
function severityHeaderSubtle(s) {
  if (s === "out_of_stock" || s === "critical") return "#fecaca";
  return "#fde68a";
}
function productPageUrl(productId, categorySlug) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const base = appUrl.replace(/\/$/, "");
  const slug = categorySlug?.trim();
  if (slug) {
    return `${base}/products/category/${encodeURIComponent(slug)}/family/${productId}`;
  }
  return `${base}/products/${productId}`;
}
function ctaLabel(audience) {
  return audience === "warehouse" ? "Open product" : "Review inventory";
}
function buildProductStockAlertEmailHtml(p) {
  const sizeLabel = p.size?.trim() ? `, ${p.size.trim()}` : "";
  const productLine = `${p.productName}${sizeLabel}`;
  const branchSuffix = p.branchName?.trim() ? ` \u2014 ${p.branchName.trim()}` : "";
  const severityText = severityLabel(p.severity);
  const headerGradient = severityHeaderGradient(p.severity);
  const headerSubtle = severityHeaderSubtle(p.severity);
  const summaryRows = [
    detailRow("Product", productLine),
    detailRow("SKU", p.sku),
    detailRow("Branch", p.branchName?.trim() || "All branches"),
    detailRow("Current stock", `${p.newStock.toLocaleString()} units`),
    detailRow("Previous stock", `${p.previousStock.toLocaleString()} units`),
    detailRow("Reorder point", `${p.reorderPoint.toLocaleString()} units`),
    detailRow("Severity", severityText),
    ...p.triggeredBy?.trim() ? [detailRow("Triggered by", p.triggeredBy.trim())] : []
  ].join("");
  const bodyMessage = p.severity === "out_of_stock" ? `${esc(p.sku)} \xB7 ${esc(productLine)} is <strong>out of stock</strong>${esc(branchSuffix)}.` : p.severity === "critical" ? `${esc(p.sku)} \xB7 ${esc(productLine)} is at <strong>critical stock</strong>${esc(branchSuffix)}: ${p.newStock.toLocaleString()} units on hand (reorder at ${p.reorderPoint.toLocaleString()}).` : `${esc(p.sku)} \xB7 ${esc(productLine)} is <strong>below reorder point</strong>${esc(branchSuffix)}: ${p.newStock.toLocaleString()} units on hand (reorder at ${p.reorderPoint.toLocaleString()}).`;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="background:${headerGradient};padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Inventory alert \u2014 ${esc(severityText)}</h1>
            <p style="margin:8px 0 0;color:${headerSubtle};font-size:14px;">${esc(p.sku)} \xB7 ${esc(productLine)}${esc(branchSuffix)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.sku, `Stock alert \xB7 ${severityText}`)}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">
              ${bodyMessage}
            </p>
            ${infoCard("Stock snapshot", summaryRows, `${p.sku} \xB7 ${p.variantId}`)}
            ${sectionTitle("Next steps", p.sku)}
            <ul style="margin:0 0 24px;padding-left:20px;font-size:14px;line-height:1.6;color:#374151;">
              <li>Confirm on-hand stock against the system value.</li>
              <li>Open the product page to review variant history and assigned suppliers.</li>
              <li>Initiate a production request or inter-branch transfer as appropriate.</li>
            </ul>
            <div style="text-align:center;">
              <a href="${productPageUrl(p.productId, p.categorySlug)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">${esc(ctaLabel(p.audience))}</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex \xB7 Inventory notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// server/email/materialStockAlertEmail.ts
function severityLabel2(s) {
  switch (s) {
    case "out_of_stock":
      return "Out of stock";
    case "critical":
      return "Critical stock";
    case "low_stock":
    default:
      return "Below reorder point";
  }
}
function severityHeaderGradient2(s) {
  if (s === "out_of_stock" || s === "critical") {
    return "linear-gradient(135deg,#991b1b,#b91c1c)";
  }
  return "linear-gradient(135deg,#b45309,#d97706)";
}
function severityHeaderSubtle2(s) {
  if (s === "out_of_stock" || s === "critical") return "#fecaca";
  return "#fde68a";
}
function materialPageUrl(materialId) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  return `${appUrl.replace(/\/$/, "")}/materials/${materialId}`;
}
function ctaLabel2(audience) {
  return audience === "warehouse" ? "Open material" : "Review inventory";
}
function formatQty(n, unit) {
  const cleanUnit = unit?.trim() || "units";
  return `${n.toLocaleString()} ${cleanUnit}`;
}
function buildMaterialStockAlertEmailHtml(p) {
  const branchSuffix = p.branchName?.trim() ? ` \u2014 ${p.branchName.trim()}` : "";
  const severityText = severityLabel2(p.severity);
  const headerGradient = severityHeaderGradient2(p.severity);
  const headerSubtle = severityHeaderSubtle2(p.severity);
  const summaryRows = [
    detailRow("Material", p.name),
    detailRow("SKU", p.sku),
    detailRow("Branch", p.branchName?.trim() || "All branches"),
    detailRow("Current stock", formatQty(p.newStock, p.unit)),
    detailRow("Previous stock", formatQty(p.previousStock, p.unit)),
    detailRow("Reorder point", formatQty(p.reorderPoint, p.unit)),
    detailRow("Severity", severityText),
    ...p.primarySupplier?.trim() ? [detailRow("Primary supplier", p.primarySupplier.trim())] : [],
    ...p.triggeredBy?.trim() ? [detailRow("Triggered by", p.triggeredBy.trim())] : []
  ].join("");
  const bodyMessage = p.severity === "out_of_stock" ? `${esc(p.sku)} \xB7 ${esc(p.name)} is <strong>out of stock</strong>${esc(branchSuffix)}.` : p.severity === "critical" ? `${esc(p.sku)} \xB7 ${esc(p.name)} is at <strong>critical stock</strong>${esc(branchSuffix)}: ${formatQty(p.newStock, p.unit)} on hand (reorder at ${formatQty(p.reorderPoint, p.unit)}).` : `${esc(p.sku)} \xB7 ${esc(p.name)} is <strong>below reorder point</strong>${esc(branchSuffix)}: ${formatQty(p.newStock, p.unit)} on hand (reorder at ${formatQty(p.reorderPoint, p.unit)}).`;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="background:${headerGradient};padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Raw material alert \u2014 ${esc(severityText)}</h1>
            <p style="margin:8px 0 0;color:${headerSubtle};font-size:14px;">${esc(p.sku)} \xB7 ${esc(p.name)}${esc(branchSuffix)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.sku, `Material alert \xB7 ${severityText}`)}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">
              ${bodyMessage}
            </p>
            ${infoCard("Stock snapshot", summaryRows, `${p.sku} \xB7 ${p.materialId}`)}
            ${sectionTitle("Next steps", p.sku)}
            <ul style="margin:0 0 24px;padding-left:20px;font-size:14px;line-height:1.6;color:#374151;">
              <li>Verify on-hand stock against the system value.</li>
              <li>Open the material page to review consumption trends and supplier history.</li>
              <li>Raise a purchase order or inter-branch transfer as appropriate.</li>
            </ul>
            <div style="text-align:center;">
              <a href="${materialPageUrl(p.materialId)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">${esc(ctaLabel2(p.audience))}</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex \xB7 Raw material notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// server/email/purchaseOrderApprovalEmail.ts
function formatMoney(n, currency) {
  if (currency === "USD") {
    return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return peso(n);
}
function materialLabel(item) {
  const parts = [item.materialName?.trim(), item.brand?.trim()].filter(Boolean);
  return parts.join(" \u2014 ") || item.sku?.trim() || "Material";
}
function buildPurchaseOrderApprovalEmailHtml(p) {
  const lineCount = p.lineCount ?? p.items.length;
  const submitterLabel = p.submittedBy?.trim() || "\u2014";
  const computedTotal = p.items.reduce((sum, item) => sum + item.lineTotal, 0);
  const displayTotal = p.totalAmount > 0 ? p.totalAmount : computedTotal;
  const lineRows = p.items.map((item) => {
    const skuLine = item.sku?.trim() ? `<div style="color:#6b7280;font-size:12px;margin-top:2px;">${esc(item.sku.trim())}</div>` : "";
    const qtyLabel2 = item.unitOfMeasure?.trim() ? `${item.quantity} ${esc(item.unitOfMeasure.trim())}` : String(item.quantity);
    return `
        <tr>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;">
            <div style="font-weight:600;color:#111827;font-size:14px;">${esc(materialLabel(item))}</div>
            ${skuLine}
          </td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:center;color:#374151;">${qtyLabel2}</td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:right;color:#374151;">${formatMoney(item.unitPrice, p.currency)}</td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;color:#111827;">${formatMoney(item.lineTotal, p.currency)}</td>
        </tr>`;
  }).join("");
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const poUrl = `${appUrl.replace(/\/$/, "")}/purchase-orders/${p.purchaseOrderId}`;
  const summaryRows = [
    detailRow("PO number", p.poNumber),
    detailRow("Status", p.status, badge(p.status, statusBadgeStyle(p.status))),
    detailRow("Order date", formatDate(p.orderDate)),
    detailRow("Expected delivery", formatDate(p.expectedDeliveryDate)),
    detailRow("Line items", String(lineCount)),
    detailRow("Total", formatMoney(displayTotal, p.currency))
  ].join("");
  const peopleRows = [
    detailRow("Supplier", p.supplierName ?? "\u2014"),
    detailRow("Branch", p.branchName ?? "\u2014"),
    detailRow("Submitted by", submitterLabel)
  ].join("");
  const notesBlock = p.notes?.trim() ? infoCard("Notes", detailRow("Notes", p.notes.trim()), `${p.poNumber} \xB7 pending approval \xB7 notes`) : "";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="background:linear-gradient(135deg,#dc2626,#991b1b);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Purchase order awaiting approval</h1>
            <p style="margin:8px 0 0;color:#fecaca;font-size:14px;">${esc(p.poNumber)} \xB7 ${esc(p.branchName ?? "Branch")} \xB7 submitted by ${esc(submitterLabel)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.poNumber, "Awaiting approval")}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">A purchase order has been submitted for your review. Summary and line items are below \u2014 open the PO in Lamtex to accept or reject.</p>
            ${infoCard("Purchase order summary", summaryRows, `${p.poNumber} \xB7 pending approval \xB7 summary`)}
            ${infoCard("Supplier & branch", peopleRows, `${p.poNumber} \xB7 pending approval \xB7 supplier`)}
            ${notesBlock}
            ${sectionTitle("Materials", `${p.poNumber} \xB7 ${lineCount} item(s)`)}
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;font-size:14px;margin-bottom:8px;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th align="left" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em;">Material</th>
                  <th style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Qty</th>
                  <th align="right" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Unit</th>
                  <th align="right" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Total</th>
                </tr>
              </thead>
              <tbody>${lineRows || '<tr><td colspan="4" style="padding:20px;color:#6b7280;text-align:center;">No line items</td></tr>'}</tbody>
              <tfoot>
                <tr style="background:#fef2f2;">
                  <td colspan="3" style="padding:14px;font-weight:700;color:#991b1b;text-align:right;font-size:15px;">PO total</td>
                  <td style="padding:14px;font-weight:700;color:#991b1b;text-align:right;font-size:17px;">${formatMoney(displayTotal, p.currency)}</td>
                </tr>
              </tfoot>
            </table>
            <div style="margin-top:28px;text-align:center;">
              <a href="${poUrl}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">Review purchase order</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex ERP \xB7 Automated notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// server/email/purchaseOrderRejectedEmail.ts
function formatMoney2(n, currency) {
  if (currency === "USD") {
    return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return peso(n);
}
function materialLabel2(item) {
  const parts = [item.materialName?.trim(), item.brand?.trim()].filter(Boolean);
  return parts.join(" \u2014 ") || item.sku?.trim() || "Material";
}
function buildPurchaseOrderRejectedEmailHtml(p) {
  const lineCount = p.lineCount ?? p.items.length;
  const decidedLabel = p.rejectedBy?.trim() || "Executive";
  const computedTotal = p.items.reduce((sum, item) => sum + item.lineTotal, 0);
  const displayTotal = p.totalAmount > 0 ? p.totalAmount : computedTotal;
  const lineRows = p.items.map((item) => {
    const skuLine = item.sku?.trim() ? `<div style="color:#6b7280;font-size:12px;margin-top:2px;">${esc(item.sku.trim())}</div>` : "";
    const qtyLabel2 = item.unitOfMeasure?.trim() ? `${item.quantity} ${esc(item.unitOfMeasure.trim())}` : String(item.quantity);
    return `
        <tr>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;">
            <div style="font-weight:600;color:#111827;font-size:14px;">${esc(materialLabel2(item))}</div>
            ${skuLine}
          </td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:center;color:#374151;">${qtyLabel2}</td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:right;color:#374151;">${formatMoney2(item.unitPrice, p.currency)}</td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;color:#111827;">${formatMoney2(item.lineTotal, p.currency)}</td>
        </tr>`;
  }).join("");
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const poUrl = `${appUrl.replace(/\/$/, "")}/purchase-orders/${p.purchaseOrderId}`;
  const summaryRows = [
    detailRow("PO number", p.poNumber),
    detailRow("Status", p.status, badge(p.status, statusBadgeStyle(p.status))),
    detailRow("Supplier", p.supplierName ?? "\u2014"),
    detailRow("Branch", p.branchName ?? "\u2014"),
    detailRow("Order date", formatDate(p.orderDate)),
    detailRow("Expected delivery", formatDate(p.expectedDeliveryDate)),
    detailRow("Line items", String(lineCount)),
    detailRow("PO total", formatMoney2(displayTotal, p.currency))
  ].join("");
  const rejectionBlock = p.rejectionReason?.trim() ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr><td style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 18px;">
          <div style="font-size:13px;font-weight:600;color:#991b1b;margin-bottom:4px;">Rejection reason</div>
          <div style="font-size:13px;color:#7f1d1d;line-height:1.5;">${esc(p.rejectionReason.trim())}</div>
        </td></tr>
      </table>` : "";
  const notesBlock = p.notes?.trim() ? infoCard("Notes", detailRow("Notes", p.notes.trim()), `${p.poNumber} \xB7 rejected \xB7 notes`) : "";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="background:linear-gradient(135deg,#dc2626,#991b1b);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Your purchase order was rejected</h1>
            <p style="margin:8px 0 0;color:#fecaca;font-size:14px;">${esc(p.poNumber)} \xB7 ${esc(p.branchName ?? "Branch")}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.poNumber, "Rejected")}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">Your purchase order for <strong>${esc(p.supplierName ?? "the supplier")}</strong> was rejected by ${esc(decidedLabel)}. Review the details below and revise the PO if needed before resubmitting.</p>
            ${rejectionBlock}
            ${infoCard("Purchase order summary", summaryRows, `${p.poNumber} \xB7 rejected \xB7 summary`)}
            ${notesBlock}
            ${sectionTitle("Materials", `${p.poNumber} \xB7 ${lineCount} item(s)`)}
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;font-size:14px;margin-bottom:8px;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th align="left" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em;">Material</th>
                  <th style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Qty</th>
                  <th align="right" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Unit</th>
                  <th align="right" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Total</th>
                </tr>
              </thead>
              <tbody>${lineRows || '<tr><td colspan="4" style="padding:20px;color:#6b7280;text-align:center;">No line items</td></tr>'}</tbody>
              <tfoot>
                <tr style="background:#fef2f2;">
                  <td colspan="3" style="padding:14px;font-weight:700;color:#991b1b;text-align:right;font-size:15px;">PO total</td>
                  <td style="padding:14px;font-weight:700;color:#991b1b;text-align:right;font-size:17px;">${formatMoney2(displayTotal, p.currency)}</td>
                </tr>
              </tfoot>
            </table>
            <div style="margin-top:28px;text-align:center;">
              <a href="${poUrl}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">View PO &amp; revise</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex ERP \xB7 Automated notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// server/email/purchaseOrderCancelledEmail.ts
function formatMoney3(n, currency) {
  if (currency === "USD") {
    return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return peso(n);
}
function materialLabel3(item) {
  const parts = [item.materialName?.trim(), item.brand?.trim()].filter(Boolean);
  return parts.join(" \u2014 ") || item.sku?.trim() || "Material";
}
function buildPurchaseOrderCancelledEmailHtml(p) {
  const lineCount = p.lineCount ?? p.items.length;
  const cancelledLabel = p.cancelledBy?.trim() || "Someone";
  const computedTotal = p.items.reduce((sum, item) => sum + item.lineTotal, 0);
  const displayTotal = p.totalAmount > 0 ? p.totalAmount : computedTotal;
  const lineRows = p.items.map((item) => {
    const skuLine = item.sku?.trim() ? `<div style="color:#6b7280;font-size:12px;margin-top:2px;">${esc(item.sku.trim())}</div>` : "";
    const qtyLabel2 = item.unitOfMeasure?.trim() ? `${item.quantity} ${esc(item.unitOfMeasure.trim())}` : String(item.quantity);
    return `
        <tr>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;">
            <div style="font-weight:600;color:#111827;font-size:14px;">${esc(materialLabel3(item))}</div>
            ${skuLine}
          </td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:center;color:#374151;">${qtyLabel2}</td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:right;color:#374151;">${formatMoney3(item.unitPrice, p.currency)}</td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;color:#111827;">${formatMoney3(item.lineTotal, p.currency)}</td>
        </tr>`;
  }).join("");
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const poUrl = `${appUrl.replace(/\/$/, "")}/purchase-orders/${p.purchaseOrderId}`;
  const summaryRows = [
    detailRow("PO number", p.poNumber),
    detailRow("Supplier", p.supplierName ?? "\u2014"),
    detailRow("Branch", p.branchName ?? "\u2014"),
    detailRow("Cancelled by", cancelledLabel),
    detailRow("Order date", formatDate(p.orderDate)),
    detailRow("Line items", String(lineCount)),
    detailRow("PO total", formatMoney3(displayTotal, p.currency))
  ].join("");
  const reasonBlock = p.cancellationReason?.trim() ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr><td style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 18px;">
          <div style="font-size:13px;font-weight:600;color:#991b1b;margin-bottom:4px;">Cancellation note</div>
          <div style="font-size:13px;color:#7f1d1d;line-height:1.5;">${esc(p.cancellationReason.trim())}</div>
        </td></tr>
      </table>` : "";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="background:linear-gradient(135deg,#6b7280,#374151);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Purchase order cancelled</h1>
            <p style="margin:8px 0 0;color:#d1d5db;font-size:14px;">${esc(p.poNumber)} \xB7 ${esc(p.branchName ?? "Branch")}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.poNumber, "Cancelled")}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">Purchase order <strong>${esc(p.poNumber)}</strong> for ${esc(p.supplierName ?? "your supplier")} was cancelled by ${esc(cancelledLabel)}.</p>
            ${reasonBlock}
            ${infoCard("Purchase order summary", summaryRows, `${p.poNumber} \xB7 cancelled \xB7 summary`)}
            ${sectionTitle("Materials", `${p.poNumber} \xB7 ${lineCount} item(s)`)}
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;font-size:14px;margin-bottom:8px;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th align="left" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em;">Material</th>
                  <th style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Qty</th>
                  <th align="right" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Unit</th>
                  <th align="right" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Total</th>
                </tr>
              </thead>
              <tbody>${lineRows || '<tr><td colspan="4" style="padding:20px;color:#6b7280;text-align:center;">No line items</td></tr>'}</tbody>
            </table>
            <div style="margin-top:28px;text-align:center;">
              <a href="${poUrl}" style="display:inline-block;background:#374151;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;">View purchase order</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex ERP \xB7 Automated notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// server/email/purchaseOrderAcceptedEmail.ts
function formatMoney4(n, currency) {
  if (currency === "USD") {
    return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return peso(n);
}
function materialLabel4(item) {
  const parts = [item.materialName?.trim(), item.brand?.trim()].filter(Boolean);
  return parts.join(" \u2014 ") || item.sku?.trim() || "Material";
}
function buildPurchaseOrderAcceptedEmailHtml(p) {
  const lineCount = p.lineCount ?? p.items.length;
  const acceptedLabel = p.acceptedBy?.trim() || "Executive";
  const computedTotal = p.items.reduce((sum, item) => sum + item.lineTotal, 0);
  const displayTotal = p.totalAmount > 0 ? p.totalAmount : computedTotal;
  const lineRows = p.items.map((item) => {
    const skuLine = item.sku?.trim() ? `<div style="color:#6b7280;font-size:12px;margin-top:2px;">${esc(item.sku.trim())}</div>` : "";
    const qtyLabel2 = item.unitOfMeasure?.trim() ? `${item.quantity} ${esc(item.unitOfMeasure.trim())}` : String(item.quantity);
    return `
        <tr>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;">
            <div style="font-weight:600;color:#111827;font-size:14px;">${esc(materialLabel4(item))}</div>
            ${skuLine}
          </td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:center;color:#374151;">${qtyLabel2}</td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:right;color:#374151;">${formatMoney4(item.unitPrice, p.currency)}</td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;color:#111827;">${formatMoney4(item.lineTotal, p.currency)}</td>
        </tr>`;
  }).join("");
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const poUrl = `${appUrl.replace(/\/$/, "")}/purchase-orders/${p.purchaseOrderId}`;
  const summaryRows = [
    detailRow("PO number", p.poNumber),
    detailRow("Status", p.status, badge(p.status, statusBadgeStyle(p.status))),
    detailRow("Supplier", p.supplierName ?? "\u2014"),
    detailRow("Branch", p.branchName ?? "\u2014"),
    detailRow("Accepted by", acceptedLabel),
    detailRow("Order date", formatDate(p.orderDate)),
    detailRow("Expected delivery", formatDate(p.expectedDeliveryDate)),
    detailRow("Line items", String(lineCount)),
    detailRow("PO total", formatMoney4(displayTotal, p.currency))
  ].join("");
  const notesBlock = p.notes?.trim() ? infoCard("Notes", detailRow("Notes", p.notes.trim()), `${p.poNumber} \xB7 accepted \xB7 notes`) : "";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="background:linear-gradient(135deg,#059669,#047857);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Your purchase order was accepted</h1>
            <p style="margin:8px 0 0;color:#d1fae5;font-size:14px;">${esc(p.poNumber)} \xB7 ${esc(p.branchName ?? "Branch")}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.poNumber, "Accepted")}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">Good news \u2014 your purchase order for <strong>${esc(p.supplierName ?? "the supplier")}</strong> was accepted by ${esc(acceptedLabel)}. Use <strong>Confirm Order</strong> when the supplier order is placed.</p>
            ${infoCard("Purchase order summary", summaryRows, `${p.poNumber} \xB7 accepted \xB7 summary`)}
            ${notesBlock}
            ${sectionTitle("Materials", `${p.poNumber} \xB7 ${lineCount} item(s)`)}
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;font-size:14px;margin-bottom:8px;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th align="left" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em;">Material</th>
                  <th style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Qty</th>
                  <th align="right" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Unit</th>
                  <th align="right" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Total</th>
                </tr>
              </thead>
              <tbody>${lineRows || '<tr><td colspan="4" style="padding:20px;color:#6b7280;text-align:center;">No line items</td></tr>'}</tbody>
              <tfoot>
                <tr style="background:#ecfdf5;">
                  <td colspan="3" style="padding:14px;font-weight:700;color:#047857;text-align:right;font-size:15px;">PO total</td>
                  <td style="padding:14px;font-weight:700;color:#047857;text-align:right;font-size:17px;">${formatMoney4(displayTotal, p.currency)}</td>
                </tr>
              </tfoot>
            </table>
            <div style="margin-top:28px;text-align:center;">
              <a href="${poUrl}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">View accepted PO</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex ERP \xB7 Automated notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// server/email/purchaseOrderConfirmedEmail.ts
function formatMoney5(n, currency) {
  if (currency === "USD") {
    return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return peso(n);
}
function materialLabel5(item) {
  const parts = [item.materialName?.trim(), item.brand?.trim()].filter(Boolean);
  return parts.join(" \u2014 ") || item.sku?.trim() || "Material";
}
function buildPurchaseOrderConfirmedEmailHtml(p) {
  const isWarehouse = p.audience === "warehouse";
  const lineCount = p.lineCount ?? p.items.length;
  const confirmedLabel = p.confirmedBy?.trim() || "Executive";
  const computedTotal = p.items.reduce((sum, item) => sum + item.lineTotal, 0);
  const displayTotal = p.totalAmount > 0 ? p.totalAmount : computedTotal;
  const lineRows = p.items.map((item) => {
    const skuLine = item.sku?.trim() ? `<div style="color:#6b7280;font-size:12px;margin-top:2px;">${esc(item.sku.trim())}</div>` : "";
    const qtyLabel2 = item.unitOfMeasure?.trim() ? `${item.quantity} ${esc(item.unitOfMeasure.trim())}` : String(item.quantity);
    return `
        <tr>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;">
            <div style="font-weight:600;color:#111827;font-size:14px;">${esc(materialLabel5(item))}</div>
            ${skuLine}
          </td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:center;color:#374151;">${qtyLabel2}</td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:right;color:#374151;">${formatMoney5(item.unitPrice, p.currency)}</td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;color:#111827;">${formatMoney5(item.lineTotal, p.currency)}</td>
        </tr>`;
  }).join("");
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const poUrl = `${appUrl.replace(/\/$/, "")}/purchase-orders/${p.purchaseOrderId}`;
  const summaryRows = [
    detailRow("PO number", p.poNumber),
    detailRow("Status", p.status, badge(p.status, statusBadgeStyle(p.status))),
    detailRow("Supplier", p.supplierName ?? "\u2014"),
    detailRow("Branch", p.branchName ?? "\u2014"),
    detailRow("Confirmed by", confirmedLabel),
    detailRow("Order date", formatDate(p.orderDate)),
    detailRow("Expected delivery", formatDate(p.expectedDeliveryDate)),
    detailRow("Line items", String(lineCount)),
    detailRow("PO total", formatMoney5(displayTotal, p.currency))
  ].join("");
  const title = isWarehouse ? "Purchase order ready to receive" : "Purchase order confirmed with supplier";
  const intro = isWarehouse ? `Purchase order <strong>${esc(p.poNumber)}</strong> for ${esc(p.supplierName ?? "the supplier")} has been confirmed${p.branchName ? ` for ${esc(p.branchName)}` : ""}. Materials are incoming \u2014 you can receive stock and record payment when delivery arrives.` : `Purchase order <strong>${esc(p.poNumber)}</strong> for ${esc(p.supplierName ?? "the supplier")} was confirmed with the supplier by ${esc(confirmedLabel)}. Warehouse staff have been notified to receive incoming materials.`;
  const ctaLabel3 = isWarehouse ? "Open PO to receive" : "View purchase order";
  const headerBg = isWarehouse ? "background:linear-gradient(135deg,#059669,#047857);" : "background:linear-gradient(135deg,#4f46e5,#3730a3);";
  const headerSub = isWarehouse ? "color:#d1fae5;" : "color:#c7d2fe;";
  const ctaBg = isWarehouse ? "#059669" : "#4f46e5";
  const footerBg = isWarehouse ? "#ecfdf5" : "#eef2ff";
  const footerText = isWarehouse ? "#047857" : "#3730a3";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="${headerBg}padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">${title}</h1>
            <p style="margin:8px 0 0;${headerSub}font-size:14px;">${esc(p.poNumber)} \xB7 ${esc(p.branchName ?? "Branch")}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.poNumber, "Confirmed")}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">${intro}</p>
            ${infoCard("Purchase order summary", summaryRows, `${p.poNumber} \xB7 confirmed \xB7 summary`)}
            ${sectionTitle("Materials", `${p.poNumber} \xB7 ${lineCount} item(s)`)}
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;font-size:14px;margin-bottom:8px;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th align="left" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em;">Material</th>
                  <th style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Qty</th>
                  <th align="right" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Unit</th>
                  <th align="right" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Total</th>
                </tr>
              </thead>
              <tbody>${lineRows || '<tr><td colspan="4" style="padding:20px;color:#6b7280;text-align:center;">No line items</td></tr>'}</tbody>
              <tfoot>
                <tr style="background:${footerBg};">
                  <td colspan="3" style="padding:14px;font-weight:700;color:${footerText};text-align:right;font-size:15px;">PO total</td>
                  <td style="padding:14px;font-weight:700;color:${footerText};text-align:right;font-size:17px;">${formatMoney5(displayTotal, p.currency)}</td>
                </tr>
              </tfoot>
            </table>
            <div style="margin-top:28px;text-align:center;">
              <a href="${poUrl}" style="display:inline-block;background:${ctaBg};color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">${ctaLabel3}</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex ERP \xB7 Automated notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// server/email/purchaseOrderReceivedEmail.ts
function formatMoney6(n, currency) {
  if (currency === "USD") {
    return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return peso(n);
}
function formatQty2(n) {
  return n.toLocaleString(void 0, { maximumFractionDigits: 2 });
}
function buildPurchaseOrderReceivedEmailHtml(p) {
  const isWarehouse = p.audience === "warehouse";
  const lineCount = p.lineCount ?? p.items.length;
  const receivedLabel = p.receivedBy?.trim() || (isWarehouse ? "Warehouse" : "Staff");
  const computedTotal = p.items.reduce((sum, item) => sum + item.lineTotal, 0);
  const displayTotal = p.totalAmount > 0 ? p.totalAmount : computedTotal;
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const poUrl = `${appUrl.replace(/\/$/, "")}/purchase-orders/${p.purchaseOrderId}`;
  const summaryRows = [
    detailRow("PO number", p.poNumber),
    detailRow("Status", p.status, badge(p.status, statusBadgeStyle(p.status))),
    detailRow("Supplier", p.supplierName ?? "\u2014"),
    detailRow("Branch", p.branchName ?? "\u2014"),
    detailRow("Received by", receivedLabel),
    detailRow("Received / ordered", `${formatQty2(p.quantityReceived)} / ${formatQty2(p.quantityOrdered)}`),
    detailRow("Receipt type", p.isFullReceive ? "Full receive" : "Partial receive"),
    detailRow("Line items", String(lineCount)),
    detailRow("PO total", formatMoney6(displayTotal, p.currency))
  ].join("");
  const title = p.isFullReceive ? "Purchase order fully received" : "Partial receipt recorded";
  const ratioLabel = `${formatQty2(p.quantityReceived)} / ${formatQty2(p.quantityOrdered)}`;
  const intro = p.isFullReceive ? `Purchase order <strong>${esc(p.poNumber)}</strong> from ${esc(p.supplierName ?? "the supplier")} was fully received${p.branchName ? ` at ${esc(p.branchName)}` : ""} \u2014 <strong>${ratioLabel}</strong> received.` : `A partial receipt was recorded on PO <strong>${esc(p.poNumber)}</strong> from ${esc(p.supplierName ?? "the supplier")} \u2014 now <strong>${ratioLabel}</strong> received.`;
  return `<!DOCTYPE html>

<html lang="en">

<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>

<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;padding:32px 16px;min-height:100vh;">

    <tr><td align="center">

      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">

        <tr>

          <td style="background:linear-gradient(135deg,#059669,#047857);padding:28px 32px;">

            <p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:rgba(255,255,255,.85);">Lamtex \xB7 ${isWarehouse ? "Warehouse" : "Executive"}</p>

            <h1 style="margin:0;font-size:22px;font-weight:700;color:#fff;line-height:1.3;">${esc(title)}</h1>

          </td>

        </tr>

        <tr>

          <td style="padding:28px 32px;">

            <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#374151;">${intro}</p>

            ${sectionTitle("Summary", p.poNumber)}

            ${infoCard("Receipt summary", summaryRows, `${p.poNumber} \xB7 receive`)}

            <div style="margin-top:24px;text-align:center;">

              <a href="${esc(poUrl)}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 28px;border-radius:8px;">View purchase order</a>

            </div>

            ${emailRefLine(p.poNumber, "Received")}

          </td>

        </tr>

        <tr>

          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">

            Lamtex ERP \xB7 Automated notification

          </td>

        </tr>

      </table>

    </td></tr>

  </table>

</body>

</html>`;
}

// server/email/purchaseOrderPaymentRecordedEmail.ts
function formatMoney7(n, currency) {
  if (currency === "USD") {
    return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return peso(n);
}
function buildPurchaseOrderPaymentRecordedEmailHtml(p) {
  const lineCount = p.lineCount ?? p.items.length;
  const recordedLabel = p.recordedBy?.trim() || "Staff";
  const computedTotal = p.items.reduce((sum, item) => sum + item.lineTotal, 0);
  const displayTotal = p.totalAmount > 0 ? p.totalAmount : computedTotal;
  const remaining = Math.max(0, displayTotal - p.amountPaid);
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const poUrl = `${appUrl.replace(/\/$/, "")}/purchase-orders/${p.purchaseOrderId}`;
  const title = p.paidInFull ? "Purchase order paid in full" : "PO payment recorded";
  const intro = p.paidInFull ? `Payment on PO <strong>${esc(p.poNumber)}</strong> (${esc(p.supplierName ?? "supplier")}) is now complete.` : `A payment of <strong>${formatMoney7(p.paymentAmount, p.currency)}</strong> was recorded on PO <strong>${esc(p.poNumber)}</strong> (${esc(p.supplierName ?? "supplier")}).`;
  const summaryRows = [
    detailRow("PO number", p.poNumber),
    detailRow("Supplier", p.supplierName ?? "\u2014"),
    detailRow("Branch", p.branchName ?? "\u2014"),
    detailRow("Recorded by", recordedLabel),
    detailRow("This payment", formatMoney7(p.paymentAmount, p.currency)),
    detailRow("Total paid", formatMoney7(p.amountPaid, p.currency)),
    detailRow("PO total", formatMoney7(displayTotal, p.currency)),
    detailRow("Remaining", formatMoney7(remaining, p.currency)),
    detailRow("Payment status", p.paymentStatus, badge(p.paymentStatus, statusBadgeStyle(p.paymentStatus))),
    detailRow("Line items", String(lineCount))
  ].join("");
  return `<!DOCTYPE html>

<html lang="en">

<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>

<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;padding:32px 16px;min-height:100vh;">

    <tr><td align="center">

      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">

        <tr>

          <td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:28px 32px;">

            <p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:rgba(255,255,255,.85);">Lamtex \xB7 Executive</p>

            <h1 style="margin:0;font-size:22px;font-weight:700;color:#fff;line-height:1.3;">${esc(title)}</h1>

          </td>

        </tr>

        <tr>

          <td style="padding:28px 32px;">

            <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#374151;">${intro}</p>

            ${sectionTitle("Payment summary", p.poNumber)}

            ${infoCard("Payment details", summaryRows, `${p.poNumber} \xB7 payment`)}

            <div style="margin-top:24px;text-align:center;">

              <a href="${esc(poUrl)}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 28px;border-radius:8px;">View purchase order</a>

            </div>

            ${emailRefLine(p.poNumber, "Payment")}

          </td>

        </tr>

        <tr>

          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">

            Lamtex ERP \xB7 Automated notification

          </td>

        </tr>

      </table>

    </td></tr>

  </table>

</body>

</html>`;
}

// server/email/productionRequestApprovalEmail.ts
function productLabel(item) {
  const variant = item.variantLabel?.trim();
  return variant ? `${item.productName} \u2014 ${variant}` : item.productName;
}
function buildProductionRequestApprovalEmailHtml(p) {
  const lineCount = p.lineCount ?? p.items.length;
  const submitterLabel = p.submittedBy?.trim() || p.createdBy?.trim() || "\u2014";
  const totalQty = p.totalQuantity > 0 ? p.totalQuantity : p.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const lineRows = p.items.map((item) => {
    const skuLine = item.sku?.trim() ? `<div style="color:#6b7280;font-size:12px;margin-top:2px;">${esc(item.sku.trim())}</div>` : "";
    return `
        <tr>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;">
            <div style="font-weight:600;color:#111827;font-size:14px;">${esc(productLabel(item))}</div>
            ${skuLine}
          </td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;color:#111827;">${Number(item.quantity) || 0}</td>
        </tr>`;
  }).join("");
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const prUrl = `${appUrl.replace(/\/$/, "")}/production-requests/${p.productionRequestId}`;
  const summaryRows = [
    detailRow("PR number", p.prNumber),
    detailRow("Status", p.status, badge(p.status, statusBadgeStyle(p.status))),
    detailRow("Request date", formatDate(p.requestDate)),
    detailRow("Expected completion", formatDate(p.expectedCompletionDate)),
    detailRow("Product lines", String(lineCount)),
    detailRow("Total quantity", String(totalQty))
  ].join("");
  const peopleRows = [
    detailRow("Branch", p.branchName ?? "\u2014"),
    detailRow("Submitted by", submitterLabel)
  ].join("");
  const notesBlock = p.notes?.trim() ? infoCard("Notes", detailRow("Notes", p.notes.trim()), `${p.prNumber} \xB7 pending approval \xB7 notes`) : "";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="background:linear-gradient(135deg,#dc2626,#991b1b);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Production request awaiting approval</h1>
            <p style="margin:8px 0 0;color:#fecaca;font-size:14px;">${esc(p.prNumber)} \xB7 ${esc(p.branchName ?? "Branch")} \xB7 submitted by ${esc(submitterLabel)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.prNumber, "Awaiting approval")}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">A production request has been submitted for your review. Summary and product lines are below \u2014 open the request in Lamtex to accept or reject.</p>
            ${infoCard("Production request summary", summaryRows, `${p.prNumber} \xB7 pending approval \xB7 summary`)}
            ${infoCard("Branch & submitter", peopleRows, `${p.prNumber} \xB7 pending approval \xB7 branch`)}
            ${notesBlock}
            ${sectionTitle("Products to produce", `${p.prNumber} \xB7 ${lineCount} line(s)`)}
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;font-size:14px;margin-bottom:8px;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th align="left" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em;">Product</th>
                  <th align="right" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Qty</th>
                </tr>
              </thead>
              <tbody>${lineRows || '<tr><td colspan="2" style="padding:20px;color:#6b7280;text-align:center;">No product lines</td></tr>'}</tbody>
              <tfoot>
                <tr style="background:#fef2f2;">
                  <td style="padding:14px;font-weight:700;color:#991b1b;text-align:right;font-size:15px;">Total quantity</td>
                  <td style="padding:14px;font-weight:700;color:#991b1b;text-align:right;font-size:17px;">${totalQty}</td>
                </tr>
              </tfoot>
            </table>
            <div style="margin-top:28px;text-align:center;">
              <a href="${prUrl}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">Review production request</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex ERP \xB7 Automated notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// server/email/productionRequestCancelledEmail.ts
function productLabel2(item) {
  const variant = item.variantLabel?.trim();
  return variant ? `${item.productName} \u2014 ${variant}` : item.productName;
}
function buildProductionRequestCancelledEmailHtml(p) {
  const lineCount = p.lineCount ?? p.items.length;
  const cancelledLabel = p.cancelledBy?.trim() || "Someone";
  const totalQty = p.totalQuantity > 0 ? p.totalQuantity : p.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const lineRows = p.items.map((item) => {
    const skuLine = item.sku?.trim() ? `<div style="color:#6b7280;font-size:12px;margin-top:2px;">${esc(item.sku.trim())}</div>` : "";
    return `
        <tr>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;">
            <div style="font-weight:600;color:#111827;font-size:14px;">${esc(productLabel2(item))}</div>
            ${skuLine}
          </td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;color:#111827;">${Number(item.quantity) || 0}</td>
        </tr>`;
  }).join("");
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const prUrl = `${appUrl.replace(/\/$/, "")}/production-requests/${p.productionRequestId}`;
  const summaryRows = [
    detailRow("PR number", p.prNumber),
    detailRow("Branch", p.branchName ?? "\u2014"),
    detailRow("Cancelled by", cancelledLabel),
    detailRow("Request date", formatDate(p.requestDate)),
    detailRow("Product lines", String(lineCount)),
    detailRow("Total quantity", String(totalQty))
  ].join("");
  const reasonBlock = p.cancellationReason?.trim() ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr><td style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 18px;">
          <div style="font-size:13px;font-weight:600;color:#991b1b;margin-bottom:4px;">Cancellation note</div>
          <div style="font-size:13px;color:#7f1d1d;line-height:1.5;">${esc(p.cancellationReason.trim())}</div>
        </td></tr>
      </table>` : "";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="background:linear-gradient(135deg,#6b7280,#374151);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Production request cancelled</h1>
            <p style="margin:8px 0 0;color:#d1d5db;font-size:14px;">${esc(p.prNumber)} \xB7 ${esc(p.branchName ?? "Branch")}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.prNumber, "Cancelled")}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">Production request <strong>${esc(p.prNumber)}</strong> was cancelled by ${esc(cancelledLabel)}.</p>
            ${reasonBlock}
            ${infoCard("Production request summary", summaryRows, `${p.prNumber} \xB7 cancelled \xB7 summary`)}
            ${sectionTitle("Products to produce", `${p.prNumber} \xB7 ${lineCount} line(s)`)}
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;font-size:14px;margin-bottom:8px;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th align="left" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em;">Product</th>
                  <th align="right" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Qty</th>
                </tr>
              </thead>
              <tbody>${lineRows || '<tr><td colspan="2" style="padding:20px;color:#6b7280;text-align:center;">No product lines</td></tr>'}</tbody>
            </table>
            <div style="margin-top:28px;text-align:center;">
              <a href="${prUrl}" style="display:inline-block;background:#374151;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;">View production request</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex ERP \xB7 Automated notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// server/email/productionRequestAcceptedEmail.ts
function productLabel3(item) {
  const variant = item.variantLabel?.trim();
  return variant ? `${item.productName} \u2014 ${variant}` : item.productName;
}
function buildProductionRequestAcceptedEmailHtml(p) {
  const lineCount = p.lineCount ?? p.items.length;
  const acceptedLabel = p.acceptedBy?.trim() || "Executive";
  const totalQty = p.totalQuantity > 0 ? p.totalQuantity : p.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const lineRows = p.items.map((item) => {
    const skuLine = item.sku?.trim() ? `<div style="color:#6b7280;font-size:12px;margin-top:2px;">${esc(item.sku.trim())}</div>` : "";
    return `
        <tr>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;">
            <div style="font-weight:600;color:#111827;font-size:14px;">${esc(productLabel3(item))}</div>
            ${skuLine}
          </td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;color:#111827;">${Number(item.quantity) || 0}</td>
        </tr>`;
  }).join("");
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const prUrl = `${appUrl.replace(/\/$/, "")}/production-requests/${p.productionRequestId}`;
  const summaryRows = [
    detailRow("PR number", p.prNumber),
    detailRow("Status", p.status, badge(p.status, statusBadgeStyle(p.status))),
    detailRow("Branch", p.branchName ?? "\u2014"),
    detailRow("Accepted by", acceptedLabel),
    detailRow("Request date", formatDate(p.requestDate)),
    detailRow("Expected completion", formatDate(p.expectedCompletionDate)),
    detailRow("Product lines", String(lineCount)),
    detailRow("Total quantity", String(totalQty))
  ].join("");
  const notesBlock = p.notes?.trim() ? infoCard("Notes", detailRow("Notes", p.notes.trim()), `${p.prNumber} \xB7 accepted \xB7 notes`) : "";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="background:linear-gradient(135deg,#059669,#047857);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Your production request was accepted</h1>
            <p style="margin:8px 0 0;color:#d1fae5;font-size:14px;">${esc(p.prNumber)} \xB7 ${esc(p.branchName ?? "Branch")}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.prNumber, "Accepted")}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">Good news \u2014 production request <strong>${esc(p.prNumber)}</strong> was accepted by ${esc(acceptedLabel)} and is ready to schedule production.</p>
            ${infoCard("Production request summary", summaryRows, `${p.prNumber} \xB7 accepted \xB7 summary`)}
            ${notesBlock}
            ${sectionTitle("Products to produce", `${p.prNumber} \xB7 ${lineCount} line(s)`)}
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;font-size:14px;margin-bottom:8px;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th align="left" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em;">Product</th>
                  <th align="right" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Qty</th>
                </tr>
              </thead>
              <tbody>${lineRows || '<tr><td colspan="2" style="padding:20px;color:#6b7280;text-align:center;">No product lines</td></tr>'}</tbody>
              <tfoot>
                <tr style="background:#ecfdf5;">
                  <td style="padding:14px;font-weight:700;color:#047857;text-align:right;font-size:15px;">Total quantity</td>
                  <td style="padding:14px;font-weight:700;color:#047857;text-align:right;font-size:17px;">${totalQty}</td>
                </tr>
              </tfoot>
            </table>
            <div style="margin-top:28px;text-align:center;">
              <a href="${prUrl}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">View accepted PR</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex ERP \xB7 Automated notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// server/email/productionRequestRejectedEmail.ts
function productLabel4(item) {
  const variant = item.variantLabel?.trim();
  return variant ? `${item.productName} \u2014 ${variant}` : item.productName;
}
function buildProductionRequestRejectedEmailHtml(p) {
  const lineCount = p.lineCount ?? p.items.length;
  const rejectedLabel = p.rejectedBy?.trim() || "Executive";
  const totalQty = p.totalQuantity > 0 ? p.totalQuantity : p.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const lineRows = p.items.map((item) => {
    const skuLine = item.sku?.trim() ? `<div style="color:#6b7280;font-size:12px;margin-top:2px;">${esc(item.sku.trim())}</div>` : "";
    return `
        <tr>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;">
            <div style="font-weight:600;color:#111827;font-size:14px;">${esc(productLabel4(item))}</div>
            ${skuLine}
          </td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;color:#111827;">${Number(item.quantity) || 0}</td>
        </tr>`;
  }).join("");
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const prUrl = `${appUrl.replace(/\/$/, "")}/production-requests/${p.productionRequestId}`;
  const summaryRows = [
    detailRow("PR number", p.prNumber),
    detailRow("Branch", p.branchName ?? "\u2014"),
    detailRow("Rejected by", rejectedLabel),
    detailRow("Request date", formatDate(p.requestDate)),
    detailRow("Product lines", String(lineCount)),
    detailRow("Total quantity", String(totalQty))
  ].join("");
  const reasonBlock = p.rejectionReason?.trim() ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr><td style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 18px;">
          <div style="font-size:13px;font-weight:600;color:#991b1b;margin-bottom:4px;">Rejection reason</div>
          <div style="font-size:13px;color:#7f1d1d;line-height:1.5;">${esc(p.rejectionReason.trim())}</div>
        </td></tr>
      </table>` : "";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="background:linear-gradient(135deg,#dc2626,#991b1b);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Your production request was rejected</h1>
            <p style="margin:8px 0 0;color:#fecaca;font-size:14px;">${esc(p.prNumber)} \xB7 ${esc(p.branchName ?? "Branch")}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.prNumber, "Rejected")}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">Production request <strong>${esc(p.prNumber)}</strong> was rejected by ${esc(rejectedLabel)}. Review the reason below and resubmit a revised request if needed.</p>
            ${reasonBlock}
            ${infoCard("Production request summary", summaryRows, `${p.prNumber} \xB7 rejected \xB7 summary`)}
            ${sectionTitle("Products to produce", `${p.prNumber} \xB7 ${lineCount} line(s)`)}
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;font-size:14px;margin-bottom:8px;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th align="left" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em;">Product</th>
                  <th align="right" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Qty</th>
                </tr>
              </thead>
              <tbody>${lineRows || '<tr><td colspan="2" style="padding:20px;color:#6b7280;text-align:center;">No product lines</td></tr>'}</tbody>
            </table>
            <div style="margin-top:28px;text-align:center;">
              <a href="${prUrl}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;">View production request</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex ERP \xB7 Automated notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// server/email/productionRequestStartedEmail.ts
function productLabel5(item) {
  const variant = item.variantLabel?.trim();
  return variant ? `${item.productName} \u2014 ${variant}` : item.productName;
}
function buildProductionRequestStartedEmailHtml(p) {
  const lineCount = p.lineCount ?? p.items.length;
  const startedLabel = p.startedBy?.trim() || "Warehouse";
  const totalQty = p.totalQuantity > 0 ? p.totalQuantity : p.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const lineRows = p.items.map((item) => {
    const skuLine = item.sku?.trim() ? `<div style="color:#6b7280;font-size:12px;margin-top:2px;">${esc(item.sku.trim())}</div>` : "";
    return `
        <tr>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;">
            <div style="font-weight:600;color:#111827;font-size:14px;">${esc(productLabel5(item))}</div>
            ${skuLine}
          </td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;color:#111827;">${Number(item.quantity) || 0}</td>
        </tr>`;
  }).join("");
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const prUrl = `${appUrl.replace(/\/$/, "")}/production-requests/${p.productionRequestId}`;
  const summaryRows = [
    detailRow("PR number", p.prNumber),
    detailRow("Status", p.status, badge(p.status, statusBadgeStyle(p.status))),
    detailRow("Branch", p.branchName ?? "\u2014"),
    detailRow("Started by", startedLabel),
    detailRow("Expected completion", formatDate(p.expectedCompletionDate)),
    detailRow("Product lines", String(lineCount)),
    detailRow("Total quantity", String(totalQty))
  ].join("");
  const notesBlock = p.notes?.trim() ? infoCard("Notes", detailRow("Notes", p.notes.trim()), `${p.prNumber} \xB7 in progress \xB7 notes`) : "";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Production started</h1>
            <p style="margin:8px 0 0;color:#dbeafe;font-size:14px;">${esc(p.prNumber)} \xB7 ${esc(p.branchName ?? "Branch")}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.prNumber, "In Progress")}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">Production has started on <strong>${esc(p.prNumber)}</strong>${p.branchName ? ` at ${esc(p.branchName)}` : ""}, started by ${esc(startedLabel)}. Raw materials have been consumed per BOM where applicable.</p>
            ${infoCard("Production request summary", summaryRows, `${p.prNumber} \xB7 in progress \xB7 summary`)}
            ${notesBlock}
            ${sectionTitle("Products to produce", `${p.prNumber} \xB7 ${lineCount} line(s)`)}
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;font-size:14px;margin-bottom:8px;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th align="left" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em;">Product</th>
                  <th align="right" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Qty</th>
                </tr>
              </thead>
              <tbody>${lineRows || '<tr><td colspan="2" style="padding:20px;color:#6b7280;text-align:center;">No product lines</td></tr>'}</tbody>
              <tfoot>
                <tr style="background:#eff6ff;">
                  <td style="padding:14px;font-weight:700;color:#1d4ed8;text-align:right;font-size:15px;">Total quantity</td>
                  <td style="padding:14px;font-weight:700;color:#1d4ed8;text-align:right;font-size:17px;">${totalQty}</td>
                </tr>
              </tfoot>
            </table>
            <div style="margin-top:28px;text-align:center;">
              <a href="${prUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">View production request</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex ERP \xB7 Automated notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// server/email/productionRequestCompletedEmail.ts
function productLabel6(item) {
  const variant = item.variantLabel?.trim();
  return variant ? `${item.productName} \u2014 ${variant}` : item.productName;
}
function buildProductionRequestCompletedEmailHtml(p) {
  const lineCount = p.lineCount ?? p.items.length;
  const completedLabel = p.completedBy?.trim() || "Warehouse";
  const totalQty = p.totalQuantity > 0 ? p.totalQuantity : p.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const producedQty = typeof p.producedQuantity === "number" && p.producedQuantity > 0 ? p.producedQuantity : totalQty;
  const lineRows = p.items.map((item) => {
    const skuLine = item.sku?.trim() ? `<div style="color:#6b7280;font-size:12px;margin-top:2px;">${esc(item.sku.trim())}</div>` : "";
    const done = Number(item.quantityCompleted) || 0;
    return `
        <tr>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;">
            <div style="font-weight:600;color:#111827;font-size:14px;">${esc(productLabel6(item))}</div>
            ${skuLine}
          </td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:right;color:#374151;">${done} / ${Number(item.quantity) || 0}</td>
        </tr>`;
  }).join("");
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const prUrl = `${appUrl.replace(/\/$/, "")}/production-requests/${p.productionRequestId}`;
  const summaryRows = [
    detailRow("PR number", p.prNumber),
    detailRow("Status", p.status, badge(p.status, statusBadgeStyle(p.status))),
    detailRow("Branch", p.branchName ?? "\u2014"),
    detailRow("Completed by", completedLabel),
    detailRow("Completion date", formatDate(p.expectedCompletionDate)),
    detailRow("Product lines", String(lineCount)),
    detailRow("Units produced", `${producedQty} / ${totalQty}`)
  ].join("");
  const notesBlock = p.notes?.trim() ? infoCard("Notes", detailRow("Notes", p.notes.trim()), `${p.prNumber} \xB7 completed \xB7 notes`) : "";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="background:linear-gradient(135deg,#059669,#047857);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Production completed</h1>
            <p style="margin:8px 0 0;color:#d1fae5;font-size:14px;">${esc(p.prNumber)} \xB7 ${esc(p.branchName ?? "Branch")}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.prNumber, "Completed")}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">Production request <strong>${esc(p.prNumber)}</strong>${p.branchName ? ` at ${esc(p.branchName)}` : ""} is complete${p.completedBy ? `, marked by ${esc(completedLabel)}` : ""}. Finished units have been added to branch stock.</p>
            ${infoCard("Production request summary", summaryRows, `${p.prNumber} \xB7 completed \xB7 summary`)}
            ${notesBlock}
            ${sectionTitle("Products produced", `${p.prNumber} \xB7 ${lineCount} line(s)`)}
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;font-size:14px;margin-bottom:8px;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th align="left" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em;">Product</th>
                  <th align="right" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Done / Qty</th>
                </tr>
              </thead>
              <tbody>${lineRows || '<tr><td colspan="2" style="padding:20px;color:#6b7280;text-align:center;">No product lines</td></tr>'}</tbody>
              <tfoot>
                <tr style="background:#ecfdf5;">
                  <td style="padding:14px;font-weight:700;color:#047857;text-align:right;font-size:15px;">Units produced</td>
                  <td style="padding:14px;font-weight:700;color:#047857;text-align:right;font-size:17px;">${producedQty} / ${totalQty}</td>
                </tr>
              </tfoot>
            </table>
            <div style="margin-top:28px;text-align:center;">
              <a href="${prUrl}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">View production request</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex ERP \xB7 Automated notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// server/email/productionRequestInventoryAddedEmail.ts
function productLabel7(item) {
  const variant = item.variantLabel?.trim();
  return variant ? `${item.productName} \u2014 ${variant}` : item.productName;
}
function buildProductionRequestInventoryAddedEmailHtml(p) {
  const lineCount = p.lineCount ?? p.items.length;
  const recordedLabel = p.recordedBy?.trim() || "Warehouse";
  const totalQty = p.totalQuantity > 0 ? p.totalQuantity : p.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const producedQty = typeof p.producedQuantity === "number" ? p.producedQuantity : p.items.reduce((sum, item) => sum + (Number(item.quantityCompleted) || 0), 0);
  const addedUnits = typeof p.addedUnits === "number" ? p.addedUnits : 0;
  const lineRows = p.items.map((item) => {
    const skuLine = item.sku?.trim() ? `<div style="color:#6b7280;font-size:12px;margin-top:2px;">${esc(item.sku.trim())}</div>` : "";
    const done = Number(item.quantityCompleted) || 0;
    return `
        <tr>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;">
            <div style="font-weight:600;color:#111827;font-size:14px;">${esc(productLabel7(item))}</div>
            ${skuLine}
          </td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:right;color:#374151;">${done} / ${Number(item.quantity) || 0}</td>
        </tr>`;
  }).join("");
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const prUrl = `${appUrl.replace(/\/$/, "")}/production-requests/${p.productionRequestId}`;
  const summaryRows = [
    detailRow("PR number", p.prNumber),
    detailRow("Status", p.status, badge(p.status, statusBadgeStyle(p.status))),
    detailRow("Branch", p.branchName ?? "\u2014"),
    detailRow("Recorded by", recordedLabel),
    detailRow("Units added this run", addedUnits.toLocaleString()),
    detailRow("Total produced to date", `${producedQty.toLocaleString()} / ${totalQty.toLocaleString()}`),
    detailRow("Product lines", String(lineCount))
  ].join("");
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="background:linear-gradient(135deg,#0891b2,#0e7490);padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">New inventory from production</h1>
            <p style="margin:8px 0 0;color:#cffafe;font-size:14px;">${esc(p.prNumber)} \xB7 ${esc(p.branchName ?? "Branch")}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.prNumber, "Inventory updated")}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;"><strong>${addedUnits.toLocaleString()}</strong> new unit(s) were added to ${esc(p.branchName ?? "branch")} stock from production on <strong>${esc(p.prNumber)}</strong>${p.recordedBy ? `, recorded by ${esc(recordedLabel)}` : ""}.</p>
            ${infoCard("Production update", summaryRows, `${p.prNumber} \xB7 inventory \xB7 summary`)}
            ${sectionTitle("Products produced", `${p.prNumber} \xB7 ${lineCount} line(s)`)}
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;font-size:14px;margin-bottom:8px;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th align="left" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em;">Product</th>
                  <th align="right" style="padding:10px 14px;color:#6b7280;font-weight:600;font-size:12px;">Done / Qty</th>
                </tr>
              </thead>
              <tbody>${lineRows || '<tr><td colspan="2" style="padding:20px;color:#6b7280;text-align:center;">No product lines</td></tr>'}</tbody>
            </table>
            <div style="margin-top:28px;text-align:center;">
              <a href="${prUrl}" style="display:inline-block;background:#0891b2;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">View production request</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex ERP \xB7 Automated notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// server/email/interBranchRequestWorkflowEmail.ts
function eventHeadline(eventType) {
  switch (eventType) {
    case "submitted_for_approval":
      return { title: "Submitted for approval", subtitle: "Awaiting executive review" };
    case "approved":
      return { title: "Request approved", subtitle: "Both branches may proceed" };
    case "scheduled":
      return { title: "Shipment scheduled", subtitle: "Planned departure set" };
    case "loading":
      return { title: "Loading in progress", subtitle: "Fulfilling branch is loading stock" };
    case "packed":
      return { title: "Shipment packed", subtitle: "Ready for dispatch preparation" };
    case "ready":
      return { title: "Ready for dispatch", subtitle: "Awaiting in-transit confirmation" };
    case "in_transit":
      return { title: "In transit", subtitle: "Stock is on the way to requesting branch" };
    case "delivery_recorded":
      return { title: "Delivery recorded", subtitle: "Receipt logged at requesting branch" };
    case "fulfilled":
      return { title: "Request fulfilled", subtitle: "Inter-branch transfer closed" };
    case "cancelled":
      return { title: "Request cancelled", subtitle: "This transfer will not proceed" };
    case "rejected":
      return { title: "Request rejected", subtitle: "Review the reason and resubmit if needed" };
    default:
      return { title: "Inter-branch update", subtitle: "Status changed" };
  }
}
function qtyLabel(item) {
  const unit = item.unitOfMeasure?.trim();
  const q = Number(item.quantity) || 0;
  return unit ? `${q} ${unit}` : String(q);
}
function buildInterBranchRequestWorkflowEmailHtml(p) {
  const headline = eventHeadline(p.eventType);
  const lineCount = p.lineCount ?? p.items.length;
  const routeLabel = `${p.requestingBranchName ?? "Requesting"} \u2192 ${p.fulfillingBranchName ?? "Fulfilling"}`;
  const lineRows = p.items.map((item) => {
    const skuLine = item.sku?.trim() ? `<div style="color:#6b7280;font-size:12px;margin-top:2px;">${esc(item.sku.trim())}</div>` : "";
    const kindLabel = item.lineKind === "raw_material" ? "Material" : "Product";
    return `
        <tr>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;">
            <div style="font-weight:600;color:#111827;font-size:14px;">${esc(item.label)}</div>
            ${skuLine}
            <div style="color:#9ca3af;font-size:11px;margin-top:2px;">${kindLabel}</div>
          </td>
          <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;color:#111827;">${qtyLabel(item)}</td>
        </tr>`;
  }).join("");
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const ibrUrl = `${appUrl.replace(/\/$/, "")}/inter-branch-requests/${p.interBranchRequestId}`;
  const summaryRows = [
    detailRow("IBR number", p.ibrNumber),
    detailRow("Status", p.status, badge(p.status, statusBadgeStyle(p.status))),
    detailRow("Requesting branch", p.requestingBranchName ?? "\u2014"),
    detailRow("Fulfilling branch", p.fulfillingBranchName ?? "\u2014"),
    detailRow("Line items", String(lineCount)),
    ...p.scheduledDepartureDate ? [detailRow("Planned departure", formatDate(p.scheduledDepartureDate))] : [],
    ...p.vehicleName ? [detailRow("Truck", p.vehicleName)] : [],
    ...p.driverName && p.driverName !== "\u2014" ? [detailRow("Driver", p.driverName)] : [],
    ...p.tripNumber ? [detailRow("Trip", p.tripNumber)] : []
  ].join("");
  const actorRows = [
    ...p.submittedBy || p.createdBy ? [detailRow("Submitted by", p.submittedBy?.trim() || p.createdBy?.trim() || "\u2014")] : [],
    ...p.approvedBy ? [detailRow("Approved by", p.approvedBy)] : [],
    ...p.actor ? [detailRow("Updated by", p.actor)] : [],
    ...p.fulfilledBy ? [detailRow("Fulfilled by", p.fulfilledBy)] : [],
    ...p.cancelledBy ? [detailRow("Cancelled by", p.cancelledBy)] : [],
    ...p.rejectedBy ? [detailRow("Rejected by", p.rejectedBy)] : [],
    ...p.note?.trim() ? [detailRow("Note", p.note.trim())] : []
  ].join("");
  const rejectionReasonBlock = p.eventType === "rejected" && p.rejectionReason?.trim() ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr><td style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 18px;">
          <div style="font-size:13px;font-weight:600;color:#991b1b;margin-bottom:4px;">Rejection reason</div>
          <div style="font-size:13px;color:#7f1d1d;line-height:1.5;">${esc(p.rejectionReason.trim())}</div>
        </td></tr>
      </table>` : "";
  const notesBlock = p.notes?.trim() ? infoCard("Notes", detailRow("Notes", p.notes.trim()), `${p.ibrNumber} \xB7 notes`) : "";
  const peopleBlock = actorRows ? infoCard("People & notes", actorRows, `${p.ibrNumber} \xB7 people`) : "";
  const headerBg = p.eventType === "rejected" ? "background:linear-gradient(135deg,#dc2626,#991b1b);" : "background:linear-gradient(135deg,#0d9488,#0f766e);";
  const headerSubColor = p.eventType === "rejected" ? "#fecaca" : "#ccfbf1";
  const headerSub2Color = p.eventType === "rejected" ? "#fca5a5" : "#99f6e4";
  const ctaBg = p.eventType === "rejected" ? "#dc2626" : "#0d9488";
  const introText = p.eventType === "rejected" ? `Inter-branch request <strong>${esc(p.ibrNumber)}</strong> (${esc(routeLabel)}) was rejected.` : `Inter-branch request <strong>${esc(p.ibrNumber)}</strong> (${esc(routeLabel)}) has been updated.`;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="${headerBg}padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">${esc(headline.title)}</h1>
            <p style="margin:8px 0 0;color:${headerSubColor};font-size:14px;">${esc(p.ibrNumber)} \xB7 ${esc(routeLabel)}</p>
            <p style="margin:4px 0 0;color:${headerSub2Color};font-size:13px;">${esc(headline.subtitle)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.ibrNumber, p.status)}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">${introText}</p>
            ${rejectionReasonBlock}
            ${infoCard("Request summary", summaryRows, `${p.ibrNumber} \xB7 summary`)}
            ${peopleBlock}
            ${notesBlock}
            ${sectionTitle("Line items")}
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th style="padding:10px 14px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.04em;">Item</th>
                  <th style="padding:10px 14px;text-align:right;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.04em;">Qty</th>
                </tr>
              </thead>
              <tbody>${lineRows || `<tr><td colspan="2" style="padding:14px;color:#6b7280;">No line items</td></tr>`}</tbody>
            </table>
            <div style="margin-top:28px;text-align:center;">
              <a href="${esc(ibrUrl)}" style="display:inline-block;background:${ctaBg};color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">View inter-branch request</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 24px;border-top:1px solid #f3f4f6;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;">This is an automated notification from Lamtex. Do not reply to this email.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// server/email/notificationSubjects.ts
function notificationSubject(audience, body) {
  return `[${audience}] ${body}`;
}
function warehouseBranchSubject(branchName, body) {
  const name = branchName?.trim() || "Branch";
  return `[Warehouse - ${name}] ${body}`;
}
function logisticsBranchSubject(branchName, body) {
  const name = branchName?.trim() || "Branch";
  return `[Logistics - ${name}] ${body}`;
}
function orderCreatedSubject(p) {
  return notificationSubject("Executive", `New order ${p.orderNumber} \u2014 ${p.customerName ?? "Customer"}`);
}
function orderSubmittedForApprovalSubject(p) {
  return notificationSubject(
    "Executive",
    `Order ${p.orderNumber} submitted for approval \u2014 ${p.customerName ?? "Customer"}`
  );
}
function purchaseOrderSubmittedForApprovalSubject(p) {
  return notificationSubject(
    "Executive",
    `${p.poNumber} submitted for approval \u2014 ${p.supplierName ?? "Supplier"}`
  );
}
function purchaseOrderRejectedSubject(p) {
  return notificationSubject(
    "Warehouse",
    `${p.poNumber} rejected \u2014 ${p.supplierName ?? "Supplier"}`
  );
}
function purchaseOrderCancelledSubject(p) {
  return notificationSubject(
    "Warehouse",
    `${p.poNumber} cancelled \u2014 ${p.supplierName ?? "Supplier"}`
  );
}
function productionRequestSubmittedForApprovalSubject(p) {
  return notificationSubject(
    "Executive",
    `${p.prNumber} submitted for approval \u2014 ${p.branchName ?? "Branch"}`
  );
}
function productionRequestCancelledSubject(p) {
  return notificationSubject(
    "Warehouse",
    `${p.prNumber} cancelled \u2014 ${p.branchName ?? "Branch"}`
  );
}
function productionRequestAcceptedSubject(p) {
  return notificationSubject(
    "Warehouse",
    `${p.prNumber} accepted \u2014 ${p.branchName ?? "Branch"}`
  );
}
function productionRequestRejectedSubject(p) {
  return notificationSubject(
    "Warehouse",
    `${p.prNumber} rejected \u2014 ${p.branchName ?? "Branch"}`
  );
}
function productionRequestStartedSubject(p) {
  return notificationSubject(
    "Warehouse",
    `${p.prNumber} production started \u2014 ${p.branchName ?? "Branch"}`
  );
}
function productionRequestCompletedSubject(p) {
  return notificationSubject(
    "Warehouse",
    `${p.prNumber} production completed \u2014 ${p.branchName ?? "Branch"}`
  );
}
function productionRequestInventoryAddedSubject(p) {
  return notificationSubject(
    "Warehouse",
    `${p.prNumber} new inventory recorded \u2014 ${p.branchName ?? "Branch"}`
  );
}
function purchaseOrderAcceptedSubject(p) {
  return notificationSubject(
    "Warehouse",
    `${p.poNumber} accepted \u2014 ${p.supplierName ?? "Supplier"}`
  );
}
function purchaseOrderConfirmedSubject(p, audience) {
  if (audience === "warehouse") {
    return notificationSubject(
      "Warehouse",
      `${p.poNumber} confirmed \u2014 ready to receive`
    );
  }
  return notificationSubject(
    "Executive",
    `${p.poNumber} confirmed \u2014 ${p.supplierName ?? "Supplier"}`
  );
}
function purchaseOrderReceivedSubject(p, audience, isFull) {
  const body = isFull ? `${p.poNumber} fully received \u2014 ${p.supplierName ?? "Supplier"}` : `${p.poNumber} partial receipt \u2014 ${p.supplierName ?? "Supplier"}`;
  return notificationSubject(audience === "warehouse" ? "Warehouse" : "Executive", body);
}
function purchaseOrderPaymentRecordedSubject(p, paidInFull) {
  const body = paidInFull ? `${p.poNumber} paid in full \u2014 ${p.supplierName ?? "Supplier"}` : `Payment on ${p.poNumber} \u2014 ${p.supplierName ?? "Supplier"}`;
  return notificationSubject("Executive", body);
}
function orderApprovedSubject(p) {
  return notificationSubject("Agent", `Order ${p.orderNumber} approved \u2014 ${p.customerName ?? "Customer"}`);
}
function orderRejectedSubject(p) {
  return notificationSubject("Agent", `Order ${p.orderNumber} rejected \u2014 ${p.customerName ?? "Customer"}`);
}
function orderRevisedSubject(p) {
  return notificationSubject("Executive", `Order ${p.orderNumber} revised \u2014 ${p.customerName ?? "Customer"}`);
}
function orderCancelledSubject(p, notifyTarget) {
  if (notifyTarget === "agent") {
    return notificationSubject("Agent", `Order ${p.orderNumber} cancelled \u2014 ${p.customerName ?? "Customer"}`);
  }
  return notificationSubject(
    "Executive",
    `Order ${p.orderNumber} cancelled by agent \u2014 ${p.customerName ?? "Customer"}`
  );
}
function orderLogisticsReadySubject(p) {
  return notificationSubject("Logistics", `Order ${p.orderNumber} approved \u2014 ready to schedule`);
}
function orderLogisticsLoadingSubject(p) {
  return notificationSubject("Logistics", `Order ${p.orderNumber} \u2014 loading started`);
}
function orderPackedSubject(p, notifyTarget) {
  if (notifyTarget === "agent") {
    return notificationSubject(
      "Agent",
      `Order ${p.orderNumber} packed \u2014 ${p.customerName ?? "your customer"}`
    );
  }
  return notificationSubject("Logistics", `Order ${p.orderNumber} \u2014 packed and ready`);
}
function orderCustomerApprovedSubject(p) {
  return notificationSubject("Customer", `Your order ${p.orderNumber} has been approved`);
}
function orderCustomerScheduledSubject(p) {
  return notificationSubject("Customer", `Your order ${p.orderNumber} is scheduled for delivery`);
}
function orderCustomerInTransitSubject(p) {
  return notificationSubject("Customer", `Your order ${p.orderNumber} is on the way`);
}
function orderInTransitSubject(p, notifyTarget) {
  if (notifyTarget === "warehouse") {
    return notificationSubject("Warehouse", `Order ${p.orderNumber} departed \u2014 in transit`);
  }
  if (notifyTarget === "agent") {
    return notificationSubject(
      "Agent",
      `Order ${p.orderNumber} in transit \u2014 ${p.customerName ?? "your customer"}`
    );
  }
  return notificationSubject("Executive", `Order ${p.orderNumber} in transit \u2014 ${p.customerName ?? "Customer"}`);
}
function orderDeliveryRecordedSubject(p, notifyTarget) {
  const isComplete = p.status === "Delivered";
  if (notifyTarget === "agent") {
    return notificationSubject(
      "Agent",
      isComplete ? `Order ${p.orderNumber} delivered \u2014 ${p.customerName ?? "your customer"}` : `Partial delivery \u2014 order ${p.orderNumber}`
    );
  }
  return notificationSubject(
    "Executive",
    isComplete ? `Order ${p.orderNumber} delivered \u2014 ${p.customerName ?? "Customer"}` : `Partial delivery \u2014 order ${p.orderNumber}`
  );
}
function orderCustomerDeliveryRecordedSubject(p) {
  if (p.status === "Delivered") {
    return notificationSubject("Customer", `Your order ${p.orderNumber} has been delivered`);
  }
  return notificationSubject("Customer", `Update on your order ${p.orderNumber} delivery`);
}
function orderCustomerPaymentRecordedSubject(p) {
  const isPaid = (p.balanceDue ?? 1) <= 0.01 || p.paymentStatus === "Paid";
  if (isPaid) {
    return notificationSubject("Customer", `Payment received \u2014 order ${p.orderNumber} paid in full`);
  }
  const amt = p.paymentAmount != null && p.paymentAmount > 0 ? ` \u2014 \u20B1${p.paymentAmount.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "";
  return notificationSubject("Customer", `Payment received on order ${p.orderNumber}${amt}`);
}
function orderCustomerUnscheduledSubject(p) {
  return notificationSubject("Customer", `Update on your order ${p.orderNumber} delivery schedule`);
}
function orderCustomerPortalShareSubject(p) {
  return notificationSubject("Customer", `View your order ${p.orderNumber} online`);
}
function orderDeliveryProofUploadedAgentSubject(p) {
  return notificationSubject(
    "Agent",
    `Delivery proof uploaded \u2014 order ${p.orderNumber} (${p.customerName ?? "Customer"})`
  );
}
function orderOtherProofUploadedAgentSubject(p) {
  return notificationSubject(
    "Agent",
    `Other document uploaded \u2014 order ${p.orderNumber} (${p.customerName ?? "Customer"})`
  );
}
function orderPaymentProofUploadedAgentSubject(p) {
  const paymentTotal = (p.paymentCash ?? 0) + (p.paymentCredit ?? 0);
  const paidInFull = paymentTotal > 0 && p.balanceDue != null && (p.balanceDue <= 0.01 || p.paymentStatus === "Paid");
  if (paidInFull) {
    return notificationSubject(
      "Agent",
      `Order paid in full \u2014 ${p.orderNumber} (${p.customerName ?? "Customer"})`
    );
  }
  return notificationSubject(
    "Agent",
    `Payment proof uploaded \u2014 order ${p.orderNumber} (${p.customerName ?? "Customer"})`
  );
}
function orderPaymentRecordedExecutiveSubject(p) {
  const paidInFull = p.balanceDue != null && (p.balanceDue <= 0.01 || p.paymentStatus === "Paid");
  if (paidInFull) {
    return notificationSubject(
      "Executive",
      `Order paid in full \u2014 ${p.orderNumber} (${p.customerName ?? "Customer"})`
    );
  }
  const amt = p.paymentAmount != null && p.paymentAmount > 0 ? ` \u2014 \u20B1${p.paymentAmount.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "";
  return notificationSubject(
    "Executive",
    `Payment received on order ${p.orderNumber} (${p.customerName ?? "Customer"})${amt}`
  );
}
function orderPaymentOverdueSubject(p, target) {
  const days = p.daysOverdue != null && p.daysOverdue > 0 ? ` \u2014 ${p.daysOverdue}d overdue` : "";
  const role = target === "agent" ? "Agent" : "Executive";
  return notificationSubject(
    role,
    `Payment overdue \u2014 order ${p.orderNumber} (${p.customerName ?? "Customer"})${days}`
  );
}
function orderCustomerPaymentOverdueSubject(p) {
  const days = p.daysOverdue != null && p.daysOverdue > 0 ? ` \u2014 ${p.daysOverdue} day(s) past due` : "";
  return notificationSubject("Customer", `Payment reminder \u2014 order ${p.orderNumber}${days}`);
}
function orderCommissionPaidAgentSubject(p) {
  const isBulk = (p.proofCount ?? 1) > 1;
  const amt = p.commissionAmount != null && p.commissionAmount > 0 ? ` \u2014 \u20B1${p.commissionAmount.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "";
  return notificationSubject(
    "Agent",
    isBulk ? `Commissions paid out \u2014 order ${p.orderNumber}${amt}` : `Commission paid out \u2014 order ${p.orderNumber} (${p.customerName ?? "Customer"})${amt}`
  );
}
function tripDriverAssignedSubject(p) {
  const datePart = p.scheduledDate?.trim() ? ` \u2014 ${p.scheduledDate.trim()}` : "";
  if (p.ibrNumber?.trim() || p.interBranchRequestId) {
    const ref = p.ibrNumber?.trim() || p.tripNumber;
    return notificationSubject("Driver", `Inter-branch ${ref} assigned to you${datePart}`);
  }
  return notificationSubject("Driver", `Trip ${p.tripNumber} assigned to you${datePart}`);
}
function productStockAlertSubject(p) {
  const audience = p.audience === "warehouse" ? "Warehouse" : "Executive";
  const variant = p.size?.trim() ? `${p.productName}, ${p.size.trim()}` : p.productName;
  const branchSuffix = p.branchName?.trim() ? ` \u2014 ${p.branchName.trim()}` : "";
  if (p.severity === "out_of_stock") {
    return notificationSubject(audience, `Out of stock \u2014 ${p.sku} (${variant})${branchSuffix}`);
  }
  if (p.severity === "critical") {
    return notificationSubject(audience, `Critical stock \u2014 ${p.sku} (${variant})${branchSuffix}`);
  }
  return notificationSubject(audience, `Low stock \u2014 ${p.sku} (${variant})${branchSuffix}`);
}
function materialStockAlertSubject(p) {
  const audience = p.audience === "warehouse" ? "Warehouse" : "Executive";
  const branchSuffix = p.branchName?.trim() ? ` \u2014 ${p.branchName.trim()}` : "";
  if (p.severity === "out_of_stock") {
    return notificationSubject(audience, `Material out of stock \u2014 ${p.sku} (${p.name})${branchSuffix}`);
  }
  if (p.severity === "critical") {
    return notificationSubject(audience, `Material critical stock \u2014 ${p.sku} (${p.name})${branchSuffix}`);
  }
  return notificationSubject(audience, `Material low stock \u2014 ${p.sku} (${p.name})${branchSuffix}`);
}
function interBranchSubmittedForApprovalSubject(p) {
  return notificationSubject(
    "Executive",
    `${p.ibrNumber} submitted for approval \u2014 ${p.requestingBranchName ?? "Branch"} \u2192 ${p.fulfillingBranchName ?? "Branch"}`
  );
}
function interBranchApprovedSubject(p, branchName) {
  return warehouseBranchSubject(
    branchName ?? p.requestingBranchName,
    `${p.ibrNumber} approved \u2014 ${p.requestingBranchName ?? "Branch"} \u2192 ${p.fulfillingBranchName ?? "Branch"}`
  );
}
function interBranchLogisticsSubject(p, branchName) {
  const statusLabel = p.status.trim() || "updated";
  const truckBit = p.vehicleName?.trim() ? ` \xB7 ${p.vehicleName.trim()}` : "";
  const driverBit = p.driverName?.trim() && p.driverName.trim() !== "\u2014" ? ` \xB7 ${p.driverName.trim()}` : "";
  return warehouseBranchSubject(
    branchName ?? p.requestingBranchName,
    `${p.ibrNumber} ${statusLabel.toLowerCase()} \u2014 from ${p.fulfillingBranchName ?? "Branch"}${truckBit}${driverBit}`
  );
}
function interBranchDeliveryRecordedSubject(p, branchName) {
  return warehouseBranchSubject(
    branchName,
    `${p.ibrNumber} delivery recorded \u2014 ${p.status}`
  );
}
function interBranchFulfilledSubject(p, audience, branchName) {
  const body = `${p.ibrNumber} fulfilled and closed \u2014 ${p.requestingBranchName ?? "Branch"} \u2194 ${p.fulfillingBranchName ?? "Branch"}`;
  if (audience === "executive") {
    return notificationSubject("Executive", body);
  }
  return warehouseBranchSubject(branchName, body);
}
function interBranchCancelledSubject(p, branchName) {
  return warehouseBranchSubject(
    branchName,
    `${p.ibrNumber} cancelled \u2014 ${p.requestingBranchName ?? "Branch"} \u2192 ${p.fulfillingBranchName ?? "Branch"}`
  );
}
function interBranchRejectedSubject(p, branchName) {
  return warehouseBranchSubject(
    branchName ?? p.requestingBranchName,
    `${p.ibrNumber} rejected \u2014 ${p.requestingBranchName ?? "Branch"} \u2192 ${p.fulfillingBranchName ?? "Branch"}`
  );
}
function orderScheduledSubject(p, notifyTarget) {
  if (notifyTarget === "warehouse") {
    return notificationSubject("Warehouse", `Order ${p.orderNumber} scheduled \u2014 prepare for loading`);
  }
  if (notifyTarget === "agent") {
    return notificationSubject(
      "Agent",
      `Order ${p.orderNumber} scheduled for ${p.customerName ?? "your customer"}`
    );
  }
  return notificationSubject("Executive", `Order ${p.orderNumber} scheduled \u2014 ${p.customerName ?? "Customer"}`);
}

// server/env.ts
function readEnv(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw === "") return fallback;
  let value = raw.trim();
  if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
    value = value.slice(1, -1).trim();
  }
  return value || fallback;
}

// server/app.ts
var app = (0, import_express.default)();
app.use(import_express.default.json({ limit: "1mb" }));
app.use((req, _res, next) => {
  if (!process.env.VERCEL) {
    next();
    return;
  }
  const originalPath = req.query.originalPath;
  if (typeof originalPath === "string" && originalPath.trim() !== "") {
    const clean = originalPath.replace(/^\/+/, "");
    const qIndex = req.url?.indexOf("?") ?? -1;
    let extra = "";
    if (qIndex >= 0 && req.url) {
      const params = new URLSearchParams(req.url.slice(qIndex + 1));
      params.delete("originalPath");
      const rest = params.toString();
      if (rest) extra = `?${rest}`;
    }
    req.url = `/api/${clean}${extra}`;
    delete req.query.originalPath;
    next();
    return;
  }
  const forwarded = req.headers["x-vercel-forwarded-url"] ?? req.headers["x-forwarded-uri"] ?? req.headers["x-invoke-path"];
  if (typeof forwarded === "string") {
    const path = forwarded.split("?")[0];
    if (path.startsWith("/api/") && path !== "/api/index") {
      req.url = forwarded.startsWith("/api") ? forwarded : path;
    }
  }
  next();
});
var resendKey = readEnv("RESEND_API_KEY");
var fromEmail = readEnv("RESEND_FROM_EMAIL", "onboarding@resend.dev");
var emailOverride = readEnv("NOTIFICATIONS_EMAIL_OVERRIDE", "jeymson9000@gmail.com");
function resolveRecipient(to) {
  const override = readEnv("NOTIFICATIONS_EMAIL_OVERRIDE");
  if (override) return override;
  const direct = to?.trim();
  if (direct) return direct;
  return emailOverride;
}
async function sendViaResend(opts) {
  if (!resendKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  const resend = new import_resend.Resend(resendKey);
  const { data, error } = await resend.emails.send({
    from: `Lamtex Notifications <${fromEmail}>`,
    to: [opts.to],
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    headers: opts.entityRef ? { "X-Entity-Ref-ID": opts.entityRef } : void 0
  });
  if (error) {
    throw new Error(error.message ?? "Failed to send email");
  }
  return { id: data?.id };
}
async function sendOrderNotificationEmail(payload, subject, res, to, kind = "created") {
  try {
    const sentTo = resolveRecipient(to);
    const html = kind === "submitted_for_approval" ? buildOrderApprovalEmailHtml(payload) : buildOrderCreatedEmailHtml(payload);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.orderId, kind)
    });
    res.json({ ok: true, id, sentTo });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("RESEND_API_KEY")) {
      res.status(503).json({ error: message });
      return;
    }
    console.error("[notify-server] Resend error", err);
    res.status(502).json({ error: message });
  }
}
app.post("/api/notifications/order-created", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.orderId || !payload?.orderNumber) {
      res.status(400).json({ error: "Missing orderId or orderNumber" });
      return;
    }
    const subject = orderCreatedSubject(payload);
    await sendOrderNotificationEmail(payload, subject, res, void 0, "created");
  } catch (err) {
    console.error("[notify-server]", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
  }
});
app.post("/api/notifications/order-submitted-for-approval", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.orderId || !payload?.orderNumber) {
      res.status(400).json({ error: "Missing orderId or orderNumber" });
      return;
    }
    const subject = orderSubmittedForApprovalSubject(payload);
    await sendOrderNotificationEmail(payload, subject, res, void 0, "submitted_for_approval");
  } catch (err) {
    console.error("[notify-server]", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
  }
});
app.post("/api/notifications/purchase-order-submitted-for-approval", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.purchaseOrderId || !payload?.poNumber) {
      res.status(400).json({ error: "Missing purchaseOrderId or poNumber" });
      return;
    }
    const sentTo = resolveRecipient();
    const subject = purchaseOrderSubmittedForApprovalSubject(payload);
    const html = buildPurchaseOrderApprovalEmailHtml(payload);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.purchaseOrderId, "po-submitted_for_approval")
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("RESEND_API_KEY")) {
      res.status(503).json({ error: message });
      return;
    }
    console.error("[notify-server] PO submitted-for-approval email", err);
    res.status(502).json({ error: message });
  }
});
app.post("/api/notifications/purchase-order-rejected", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.purchaseOrderId || !payload?.poNumber) {
      res.status(400).json({ error: "Missing purchaseOrderId or poNumber" });
      return;
    }
    const intended = payload.submitterEmail?.trim();
    const sentTo = resolveRecipient(intended);
    if (intended && sentTo !== intended) {
      console.log(`[notify-server] email override active: ${intended} \u2192 ${sentTo}`);
    }
    const subject = purchaseOrderRejectedSubject(payload);
    const html = buildPurchaseOrderRejectedEmailHtml(payload);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.purchaseOrderId, "po-rejected")
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("RESEND_API_KEY")) {
      res.status(503).json({ error: message });
      return;
    }
    console.error("[notify-server] PO rejected email", err);
    res.status(502).json({ error: message });
  }
});
app.post("/api/notifications/purchase-order-cancelled", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.purchaseOrderId || !payload?.poNumber) {
      res.status(400).json({ error: "Missing purchaseOrderId or poNumber" });
      return;
    }
    const intended = payload.submitterEmail?.trim();
    const sentTo = resolveRecipient(intended);
    if (intended && sentTo !== intended) {
      console.log(`[notify-server] email override active: ${intended} \u2192 ${sentTo}`);
    }
    const subject = purchaseOrderCancelledSubject(payload);
    const html = buildPurchaseOrderCancelledEmailHtml(payload);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.purchaseOrderId, "po-cancelled")
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("RESEND_API_KEY")) {
      res.status(503).json({ error: message });
      return;
    }
    console.error("[notify-server] PO cancelled email", err);
    res.status(502).json({ error: message });
  }
});
app.post("/api/notifications/production-request-submitted-for-approval", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.productionRequestId || !payload?.prNumber) {
      res.status(400).json({ error: "Missing productionRequestId or prNumber" });
      return;
    }
    const sentTo = resolveRecipient();
    const subject = productionRequestSubmittedForApprovalSubject(payload);
    const html = buildProductionRequestApprovalEmailHtml(payload);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.productionRequestId, "pr-submitted_for_approval")
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("RESEND_API_KEY")) {
      res.status(503).json({ error: message });
      return;
    }
    console.error("[notify-server] PR submitted-for-approval email", err);
    res.status(502).json({ error: message });
  }
});
app.post("/api/notifications/production-request-cancelled", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.productionRequestId || !payload?.prNumber) {
      res.status(400).json({ error: "Missing productionRequestId or prNumber" });
      return;
    }
    const intended = payload.submitterEmail?.trim();
    const sentTo = resolveRecipient(intended);
    if (intended && sentTo !== intended) {
      console.log(`[notify-server] email override active: ${intended} \u2192 ${sentTo}`);
    }
    const subject = productionRequestCancelledSubject(payload);
    const html = buildProductionRequestCancelledEmailHtml(payload);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.productionRequestId, "pr-cancelled")
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("RESEND_API_KEY")) {
      res.status(503).json({ error: message });
      return;
    }
    console.error("[notify-server] PR cancelled email", err);
    res.status(502).json({ error: message });
  }
});
app.post("/api/notifications/production-request-accepted", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.productionRequestId || !payload?.prNumber) {
      res.status(400).json({ error: "Missing productionRequestId or prNumber" });
      return;
    }
    const intended = payload.submitterEmail?.trim();
    const sentTo = resolveRecipient(intended);
    if (intended && sentTo !== intended) {
      console.log(`[notify-server] email override active: ${intended} \u2192 ${sentTo}`);
    }
    const subject = productionRequestAcceptedSubject(payload);
    const html = buildProductionRequestAcceptedEmailHtml(payload);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.productionRequestId, "pr-accepted")
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("RESEND_API_KEY")) {
      res.status(503).json({ error: message });
      return;
    }
    console.error("[notify-server] PR accepted email", err);
    res.status(502).json({ error: message });
  }
});
app.post("/api/notifications/production-request-rejected", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.productionRequestId || !payload?.prNumber) {
      res.status(400).json({ error: "Missing productionRequestId or prNumber" });
      return;
    }
    const intended = payload.submitterEmail?.trim();
    const sentTo = resolveRecipient(intended);
    if (intended && sentTo !== intended) {
      console.log(`[notify-server] email override active: ${intended} \u2192 ${sentTo}`);
    }
    const subject = productionRequestRejectedSubject(payload);
    const html = buildProductionRequestRejectedEmailHtml(payload);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.productionRequestId, "pr-rejected")
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("RESEND_API_KEY")) {
      res.status(503).json({ error: message });
      return;
    }
    console.error("[notify-server] PR rejected email", err);
    res.status(502).json({ error: message });
  }
});
app.post("/api/notifications/production-request-started", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.productionRequestId || !payload?.prNumber) {
      res.status(400).json({ error: "Missing productionRequestId or prNumber" });
      return;
    }
    const subject = productionRequestStartedSubject(payload);
    const html = buildProductionRequestStartedEmailHtml(payload);
    const inputEmails = (payload.recipientEmails ?? []).map((e) => typeof e === "string" ? e.trim() : "").filter(Boolean);
    const targets = inputEmails.length > 0 ? inputEmails : [null];
    const uniqueRecipients = [...new Set(targets.map((email) => resolveRecipient(email)))];
    const sent = [];
    for (const sentTo of uniqueRecipients) {
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.productionRequestId, "pr-started")
      });
      sent.push({ id, sentTo });
    }
    res.json({ ok: true, subject, sentCount: sent.length, sent });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("RESEND_API_KEY")) {
      res.status(503).json({ error: message });
      return;
    }
    console.error("[notify-server] PR started email", err);
    res.status(502).json({ error: message });
  }
});
app.post("/api/notifications/production-request-completed", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.productionRequestId || !payload?.prNumber) {
      res.status(400).json({ error: "Missing productionRequestId or prNumber" });
      return;
    }
    const subject = productionRequestCompletedSubject(payload);
    const html = buildProductionRequestCompletedEmailHtml(payload);
    const inputEmails = (payload.recipientEmails ?? []).map((e) => typeof e === "string" ? e.trim() : "").filter(Boolean);
    const targets = inputEmails.length > 0 ? inputEmails : [null];
    const uniqueRecipients = [...new Set(targets.map((email) => resolveRecipient(email)))];
    const sent = [];
    for (const sentTo of uniqueRecipients) {
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.productionRequestId, "pr-completed")
      });
      sent.push({ id, sentTo });
    }
    res.json({ ok: true, subject, sentCount: sent.length, sent });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("RESEND_API_KEY")) {
      res.status(503).json({ error: message });
      return;
    }
    console.error("[notify-server] PR completed email", err);
    res.status(502).json({ error: message });
  }
});
app.post("/api/notifications/production-request-inventory-added", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.productionRequestId || !payload?.prNumber) {
      res.status(400).json({ error: "Missing productionRequestId or prNumber" });
      return;
    }
    const subject = productionRequestInventoryAddedSubject(payload);
    const html = buildProductionRequestInventoryAddedEmailHtml(payload);
    const inputEmails = (payload.recipientEmails ?? []).map((e) => typeof e === "string" ? e.trim() : "").filter(Boolean);
    const targets = inputEmails.length > 0 ? inputEmails : [null];
    const uniqueRecipients = [...new Set(targets.map((email) => resolveRecipient(email)))];
    const sent = [];
    for (const sentTo of uniqueRecipients) {
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.productionRequestId, "pr-inventory-added")
      });
      sent.push({ id, sentTo });
    }
    res.json({ ok: true, subject, sentCount: sent.length, sent });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("RESEND_API_KEY")) {
      res.status(503).json({ error: message });
      return;
    }
    console.error("[notify-server] PR inventory-added email", err);
    res.status(502).json({ error: message });
  }
});
function interBranchWorkflowEmailSubject(payload, audience, branchName) {
  const ref = {
    ibrNumber: payload.ibrNumber,
    requestingBranchName: payload.requestingBranchName,
    fulfillingBranchName: payload.fulfillingBranchName
  };
  const logisticsBody = (status) => interBranchLogisticsSubject(
    {
      ...ref,
      status,
      vehicleName: payload.vehicleName,
      driverName: payload.driverName
    },
    branchName ?? payload.requestingBranchName
  );
  switch (payload.eventType) {
    case "submitted_for_approval":
      return interBranchSubmittedForApprovalSubject(ref);
    case "approved":
      if (audience === "logistics") {
        return logisticsBranchSubject(
          branchName ?? payload.fulfillingBranchName,
          `${payload.ibrNumber} approved \u2014 ${payload.requestingBranchName ?? "Branch"} \u2192 ${payload.fulfillingBranchName ?? "Branch"}`
        );
      }
      return interBranchApprovedSubject(ref, branchName);
    case "scheduled":
    case "loading":
    case "packed":
    case "ready":
    case "in_transit":
      if (audience === "logistics") {
        const statusLabel = payload.status.trim() || "updated";
        const truckBit = payload.vehicleName?.trim() ? ` \xB7 ${payload.vehicleName.trim()}` : "";
        const driverBit = payload.driverName?.trim() && payload.driverName.trim() !== "\u2014" ? ` \xB7 ${payload.driverName.trim()}` : "";
        return logisticsBranchSubject(
          branchName ?? payload.fulfillingBranchName,
          `${payload.ibrNumber} ${statusLabel.toLowerCase()} \u2014 from ${payload.fulfillingBranchName ?? "Branch"}${truckBit}${driverBit}`
        );
      }
      return logisticsBody(payload.status);
    case "delivery_recorded":
      return interBranchDeliveryRecordedSubject({ ...ref, status: payload.status }, branchName);
    case "fulfilled":
      return interBranchFulfilledSubject(ref, audience, branchName);
    case "cancelled":
      return interBranchCancelledSubject(ref, branchName);
    case "rejected":
      return interBranchRejectedSubject(ref, branchName);
    default:
      return interBranchApprovedSubject(ref, branchName);
  }
}
app.post("/api/notifications/inter-branch-workflow", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.interBranchRequestId || !payload?.ibrNumber || !payload?.eventType) {
      res.status(400).json({ error: "Missing interBranchRequestId, ibrNumber, or eventType" });
      return;
    }
    const html = buildInterBranchRequestWorkflowEmailHtml(payload);
    const groups = payload.recipientGroups ?? [];
    const sent = [];
    if (groups.length === 0) {
      const subject = interBranchWorkflowEmailSubject(payload, "executive");
      const sentTo = resolveRecipient();
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.interBranchRequestId, `ibr-${payload.eventType}`)
      });
      sent.push({ id, sentTo, subject });
    } else {
      for (const group of groups) {
        const emails = (group.emails ?? []).map((e) => typeof e === "string" ? e.trim() : "").filter(Boolean);
        const targets = emails.length > 0 ? emails : [null];
        const subject = interBranchWorkflowEmailSubject(payload, group.audience, group.branchName);
        for (const email of targets) {
          const sentTo = resolveRecipient(email);
          const { id } = await sendViaResend({
            to: sentTo,
            subject,
            html,
            entityRef: emailEntityRef(
              payload.interBranchRequestId,
              `ibr-${payload.eventType}-${group.audience}-${group.branchName ?? "na"}`
            )
          });
          if (!sent.some((s) => s.sentTo === sentTo && s.subject === subject)) {
            sent.push({ id, sentTo, subject });
          }
        }
      }
    }
    res.json({ ok: true, sentCount: sent.length, sent });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("RESEND_API_KEY")) {
      res.status(503).json({ error: message });
      return;
    }
    console.error("[notify-server] IBR workflow email", err);
    res.status(502).json({ error: message });
  }
});
app.post("/api/notifications/purchase-order-accepted", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.purchaseOrderId || !payload?.poNumber) {
      res.status(400).json({ error: "Missing purchaseOrderId or poNumber" });
      return;
    }
    const intended = payload.submitterEmail?.trim();
    const sentTo = resolveRecipient(intended);
    if (intended && sentTo !== intended) {
      console.log(`[notify-server] email override active: ${intended} \u2192 ${sentTo}`);
    }
    const subject = purchaseOrderAcceptedSubject(payload);
    const html = buildPurchaseOrderAcceptedEmailHtml(payload);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.purchaseOrderId, "po-accepted")
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("RESEND_API_KEY")) {
      res.status(503).json({ error: message });
      return;
    }
    console.error("[notify-server] PO accepted email", err);
    res.status(502).json({ error: message });
  }
});
app.post("/api/notifications/purchase-order-confirmed", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.purchaseOrderId || !payload?.poNumber || !payload?.audience) {
      res.status(400).json({ error: "Missing purchaseOrderId, poNumber, or audience" });
      return;
    }
    const subject = purchaseOrderConfirmedSubject(payload, payload.audience);
    const html = buildPurchaseOrderConfirmedEmailHtml(payload);
    const inputEmails = (payload.recipientEmails ?? []).map((e) => typeof e === "string" ? e.trim() : "").filter(Boolean);
    const targets = inputEmails.length > 0 ? inputEmails : [null];
    const uniqueRecipients = [...new Set(targets.map((email) => resolveRecipient(email)))];
    const sent = [];
    for (const sentTo of uniqueRecipients) {
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.purchaseOrderId, `po-confirmed-${payload.audience}`)
      });
      sent.push({ id, sentTo });
    }
    res.json({ ok: true, subject, audience: payload.audience, sentCount: sent.length, sent });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("RESEND_API_KEY")) {
      res.status(503).json({ error: message });
      return;
    }
    console.error("[notify-server] PO confirmed email", err);
    res.status(502).json({ error: message });
  }
});
app.post("/api/notifications/purchase-order-received", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.purchaseOrderId || !payload?.poNumber || !payload?.audience) {
      res.status(400).json({ error: "Missing purchaseOrderId, poNumber, or audience" });
      return;
    }
    const subject = purchaseOrderReceivedSubject(payload, payload.audience, payload.isFullReceive);
    const html = buildPurchaseOrderReceivedEmailHtml(payload);
    const inputEmails = (payload.recipientEmails ?? []).map((e) => typeof e === "string" ? e.trim() : "").filter(Boolean);
    const targets = inputEmails.length > 0 ? inputEmails : [null];
    const uniqueRecipients = [...new Set(targets.map((email) => resolveRecipient(email)))];
    const sent = [];
    for (const sentTo of uniqueRecipients) {
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.purchaseOrderId, `po-received-${payload.audience}`)
      });
      sent.push({ id, sentTo });
    }
    res.json({ ok: true, subject, audience: payload.audience, sentCount: sent.length, sent });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("RESEND_API_KEY")) {
      res.status(503).json({ error: message });
      return;
    }
    console.error("[notify-server] PO received email", err);
    res.status(502).json({ error: message });
  }
});
app.post("/api/notifications/purchase-order-payment-recorded", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.purchaseOrderId || !payload?.poNumber) {
      res.status(400).json({ error: "Missing purchaseOrderId or poNumber" });
      return;
    }
    const subject = purchaseOrderPaymentRecordedSubject(payload, payload.paidInFull);
    const html = buildPurchaseOrderPaymentRecordedEmailHtml(payload);
    const inputEmails = (payload.recipientEmails ?? []).map((e) => typeof e === "string" ? e.trim() : "").filter(Boolean);
    const targets = inputEmails.length > 0 ? inputEmails : [null];
    const uniqueRecipients = [...new Set(targets.map((email) => resolveRecipient(email)))];
    const sent = [];
    for (const sentTo of uniqueRecipients) {
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.purchaseOrderId, "po-payment-recorded")
      });
      sent.push({ id, sentTo });
    }
    res.json({ ok: true, subject, sentCount: sent.length, sent });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("RESEND_API_KEY")) {
      res.status(503).json({ error: message });
      return;
    }
    console.error("[notify-server] PO payment recorded email", err);
    res.status(502).json({ error: message });
  }
});
async function sendOrderDecisionEmail(payload, res) {
  try {
    const approved = payload.decision === "approved";
    const subject = approved ? orderApprovedSubject(payload) : orderRejectedSubject(payload);
    const intended = payload.agentEmail?.trim();
    const sentTo = resolveRecipient(payload.agentEmail);
    if (intended && sentTo !== intended) {
      console.log(`[notify-server] email override active: ${intended} \u2192 ${sentTo}`);
    }
    const html = buildOrderDecisionEmailHtml(payload);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.orderId, payload.decision)
    });
    res.json({ ok: true, id, sentTo, decision: payload.decision, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("RESEND_API_KEY")) {
      res.status(503).json({ error: message });
      return;
    }
    console.error("[notify-server] Resend error", err);
    res.status(502).json({ error: message });
  }
}
app.post("/api/notifications/order-approved", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.orderId || !payload?.orderNumber || payload.decision !== "approved") {
      res.status(400).json({ error: "Missing orderId, orderNumber, or invalid decision" });
      return;
    }
    await sendOrderDecisionEmail(payload, res);
  } catch (err) {
    console.error("[notify-server]", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
  }
});
app.post("/api/notifications/order-rejected", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.orderId || !payload?.orderNumber || payload.decision !== "rejected") {
      res.status(400).json({ error: "Missing orderId, orderNumber, or invalid decision" });
      return;
    }
    await sendOrderDecisionEmail(payload, res);
  } catch (err) {
    console.error("[notify-server]", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
  }
});
app.post("/api/notifications/order-ready-for-scheduling", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.orderId || !payload?.orderNumber) {
      res.status(400).json({ error: "Missing orderId or orderNumber" });
      return;
    }
    const subject = orderLogisticsReadySubject(payload);
    const html = buildOrderLogisticsReadyEmailHtml(payload);
    const emails = (payload.logisticsEmails ?? []).map((e) => e?.trim()).filter(Boolean);
    const targets = emails.length > 0 ? emails : [null];
    const uniqueRecipients = [...new Set(targets.map((email) => resolveRecipient(email)))];
    const sent = [];
    for (const sentTo of uniqueRecipients) {
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.orderId, "logistics-ready")
      });
      sent.push({ id, sentTo });
    }
    res.json({ ok: true, subject, sentCount: sent.length, sent });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("RESEND_API_KEY")) {
      res.status(503).json({ error: message });
      return;
    }
    console.error("[notify-server] order-ready-for-scheduling", err);
    res.status(502).json({ error: message });
  }
});
app.post("/api/notifications/order-loading", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.orderId || !payload?.orderNumber) {
      res.status(400).json({ error: "Missing orderId or orderNumber" });
      return;
    }
    const subject = orderLogisticsLoadingSubject(payload);
    const html = buildOrderLogisticsLoadingEmailHtml(payload);
    const emails = (payload.logisticsEmails ?? []).map((e) => e?.trim()).filter(Boolean);
    const targets = emails.length > 0 ? emails : [null];
    const uniqueRecipients = [...new Set(targets.map((email) => resolveRecipient(email)))];
    const sent = [];
    for (const sentTo of uniqueRecipients) {
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.orderId, "logistics-loading")
      });
      sent.push({ id, sentTo });
    }
    res.json({ ok: true, subject, sentCount: sent.length, sent });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("RESEND_API_KEY")) {
      res.status(503).json({ error: message });
      return;
    }
    console.error("[notify-server] order-loading", err);
    res.status(502).json({ error: message });
  }
});
app.post("/api/notifications/order-packed", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.orderId || !payload?.orderNumber) {
      res.status(400).json({ error: "Missing orderId or orderNumber" });
      return;
    }
    const sent = [];
    const logisticsEmails = (payload.logisticsEmails ?? []).map((e) => e?.trim()).filter(Boolean);
    const logisticsTargets = logisticsEmails.length > 0 ? logisticsEmails : [null];
    const uniqueLogistics = [...new Set(logisticsTargets.map((email) => resolveRecipient(email)))];
    for (const sentTo of uniqueLogistics) {
      const logisticsPayload = { ...payload, notifyTarget: "logistics" };
      const subject = orderPackedSubject(logisticsPayload, "logistics");
      const html = buildOrderPackedEmailHtml(logisticsPayload);
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.orderId, "logistics-packed")
      });
      sent.push({ id, sentTo, notifyTarget: "logistics" });
    }
    if (payload.agentEmail?.trim()) {
      const sentTo = resolveRecipient(payload.agentEmail);
      const agentPayload = { ...payload, notifyTarget: "agent" };
      const subject = orderPackedSubject(agentPayload, "agent");
      const html = buildOrderPackedEmailHtml(agentPayload);
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.orderId, "agent-packed")
      });
      sent.push({ id, sentTo, notifyTarget: "agent" });
    }
    res.json({ ok: true, sentCount: sent.length, sent });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("RESEND_API_KEY")) {
      res.status(503).json({ error: message });
      return;
    }
    console.error("[notify-server] order-packed", err);
    res.status(502).json({ error: message });
  }
});
app.post("/api/notifications/order-in-transit", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.orderId || !payload?.orderNumber || !payload.notifyTarget) {
      res.status(400).json({ error: "Missing orderId, orderNumber, or notifyTarget" });
      return;
    }
    const target = payload.notifyTarget;
    const subject = orderInTransitSubject(payload, target);
    const html = buildOrderInTransitEmailHtml(payload);
    if (target === "warehouse") {
      const emails = (payload.warehouseEmails ?? []).map((e) => e?.trim()).filter(Boolean);
      const targets = emails.length > 0 ? emails : [null];
      const uniqueRecipients = [...new Set(targets.map((email) => resolveRecipient(email)))];
      const sent = [];
      for (const sentTo2 of uniqueRecipients) {
        const { id: id2 } = await sendViaResend({
          to: sentTo2,
          subject,
          html,
          entityRef: emailEntityRef(payload.orderId, "in-transit-warehouse")
        });
        sent.push({ id: id2, sentTo: sentTo2 });
      }
      res.json({ ok: true, subject, sentCount: sent.length, sent, notifyTarget: target });
      return;
    }
    if (target === "agent") {
      const sentTo2 = resolveRecipient(payload.agentEmail);
      const { id: id2 } = await sendViaResend({
        to: sentTo2,
        subject,
        html,
        entityRef: emailEntityRef(payload.orderId, "in-transit-agent")
      });
      res.json({ ok: true, id: id2, sentTo: sentTo2, subject, notifyTarget: target });
      return;
    }
    const sentTo = resolveRecipient(null);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.orderId, "in-transit-executive")
    });
    res.json({ ok: true, id, sentTo, subject, notifyTarget: target });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("RESEND_API_KEY")) {
      res.status(503).json({ error: message });
      return;
    }
    console.error("[notify-server] order-in-transit", err);
    res.status(502).json({ error: message });
  }
});
app.post("/api/notifications/order-in-transit-customer", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.orderId || !payload?.orderNumber || !payload?.customerEmail?.trim()) {
      res.status(400).json({ error: "Missing orderId, orderNumber, or customerEmail" });
      return;
    }
    const subject = orderCustomerInTransitSubject(payload);
    const html = buildOrderCustomerInTransitEmailHtml(payload);
    const sentTo = resolveRecipient(payload.customerEmail);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.orderId, "customer-in-transit")
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("RESEND_API_KEY")) {
      res.status(503).json({ error: message });
      return;
    }
    console.error("[notify-server] order-in-transit-customer", err);
    res.status(502).json({ error: message });
  }
});
app.post("/api/notifications/order-delivery-recorded", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.orderId || !payload?.orderNumber || !payload.notifyTarget) {
      res.status(400).json({ error: "Missing orderId, orderNumber, or notifyTarget" });
      return;
    }
    const target = payload.notifyTarget;
    const subject = orderDeliveryRecordedSubject(payload, target);
    const html = buildOrderDeliveryRecordedEmailHtml(payload);
    if (target === "agent") {
      const sentTo2 = resolveRecipient(payload.agentEmail);
      const { id: id2 } = await sendViaResend({
        to: sentTo2,
        subject,
        html,
        entityRef: emailEntityRef(payload.orderId, "delivery-agent")
      });
      res.json({ ok: true, id: id2, sentTo: sentTo2, subject, notifyTarget: target });
      return;
    }
    const sentTo = resolveRecipient(null);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.orderId, "delivery-executive")
    });
    res.json({ ok: true, id, sentTo, subject, notifyTarget: target });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("RESEND_API_KEY")) {
      res.status(503).json({ error: message });
      return;
    }
    console.error("[notify-server] order-delivery-recorded", err);
    res.status(502).json({ error: message });
  }
});
app.post("/api/notifications/order-delivery-recorded-customer", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.orderId || !payload?.orderNumber || !payload?.customerEmail?.trim()) {
      res.status(400).json({ error: "Missing orderId, orderNumber, or customerEmail" });
      return;
    }
    const subject = orderCustomerDeliveryRecordedSubject(payload);
    const html = buildOrderCustomerDeliveryRecordedEmailHtml(payload);
    const sentTo = resolveRecipient(payload.customerEmail);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.orderId, "customer-delivery")
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("RESEND_API_KEY")) {
      res.status(503).json({ error: message });
      return;
    }
    console.error("[notify-server] order-delivery-recorded-customer", err);
    res.status(502).json({ error: message });
  }
});
app.post("/api/notifications/order-payment-recorded-customer", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.orderId || !payload?.orderNumber || !payload?.customerEmail?.trim()) {
      res.status(400).json({ error: "Missing orderId, orderNumber, or customerEmail" });
      return;
    }
    const subject = orderCustomerPaymentRecordedSubject(payload);
    const html = buildOrderCustomerPaymentRecordedEmailHtml(payload);
    const sentTo = resolveRecipient(payload.customerEmail);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.orderId, "customer-payment")
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("RESEND_API_KEY")) {
      res.status(503).json({ error: message });
      return;
    }
    console.error("[notify-server] order-payment-recorded-customer", err);
    res.status(502).json({ error: message });
  }
});
app.post("/api/notifications/order-approved-customer", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.orderId || !payload?.orderNumber || !payload?.customerEmail?.trim()) {
      res.status(400).json({ error: "Missing orderId, orderNumber, or customerEmail" });
      return;
    }
    const subject = orderCustomerApprovedSubject(payload);
    const html = buildOrderCustomerApprovedEmailHtml(payload);
    const sentTo = resolveRecipient(payload.customerEmail);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.orderId, "customer-approved")
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("RESEND_API_KEY")) {
      res.status(503).json({ error: message });
      return;
    }
    console.error("[notify-server] order-approved-customer", err);
    res.status(502).json({ error: message });
  }
});
app.post("/api/notifications/order-scheduled-customer", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.orderId || !payload?.orderNumber || !payload?.customerEmail?.trim()) {
      res.status(400).json({ error: "Missing orderId, orderNumber, or customerEmail" });
      return;
    }
    const subject = orderCustomerScheduledSubject(payload);
    const html = buildOrderCustomerScheduledEmailHtml(payload);
    const sentTo = resolveRecipient(payload.customerEmail);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.orderId, "customer-scheduled")
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("RESEND_API_KEY")) {
      res.status(503).json({ error: message });
      return;
    }
    console.error("[notify-server] order-scheduled-customer", err);
    res.status(502).json({ error: message });
  }
});
app.post("/api/notifications/order-unscheduled-customer", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.orderId || !payload?.orderNumber || !payload?.customerEmail?.trim()) {
      res.status(400).json({ error: "Missing orderId, orderNumber, or customerEmail" });
      return;
    }
    const subject = orderCustomerUnscheduledSubject(payload);
    const html = buildOrderCustomerUnscheduledEmailHtml(payload);
    const sentTo = resolveRecipient(payload.customerEmail);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.orderId, "customer-unscheduled")
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("RESEND_API_KEY")) {
      res.status(503).json({ error: message });
      return;
    }
    console.error("[notify-server] order-unscheduled-customer", err);
    res.status(502).json({ error: message });
  }
});
app.post("/api/notifications/order-portal-share", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.orderId || !payload?.orderNumber || !payload?.customerEmail?.trim()) {
      res.status(400).json({ error: "Missing orderId, orderNumber, or customerEmail" });
      return;
    }
    if (!payload?.portalToken?.trim()) {
      res.status(400).json({ error: "Missing portalToken" });
      return;
    }
    const subject = orderCustomerPortalShareSubject(payload);
    const html = buildOrderCustomerPortalShareEmailHtml(payload);
    const sentTo = resolveRecipient(payload.customerEmail);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.orderId, "customer-portal-share")
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("RESEND_API_KEY")) {
      res.status(503).json({ error: message });
      return;
    }
    console.error("[notify-server] order-portal-share", err);
    res.status(502).json({ error: message });
  }
});
app.post("/api/notifications/order-delivery-proof-uploaded-agent", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.orderId || !payload?.orderNumber || !payload?.agentEmail?.trim()) {
      res.status(400).json({ error: "Missing orderId, orderNumber, or agentEmail" });
      return;
    }
    const isOther = payload.proofType === "other";
    const isPayment = payload.proofType === "payment";
    const subject = isPayment ? orderPaymentProofUploadedAgentSubject(payload) : isOther ? orderOtherProofUploadedAgentSubject(payload) : orderDeliveryProofUploadedAgentSubject(payload);
    const html = buildOrderDeliveryProofUploadedEmailHtml(payload);
    const sentTo = resolveRecipient(payload.agentEmail);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(
        payload.orderId,
        isPayment ? "payment-proof-agent" : isOther ? "other-proof-agent" : "delivery-proof-agent"
      )
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("RESEND_API_KEY")) {
      res.status(503).json({ error: message });
      return;
    }
    console.error("[notify-server] order-delivery-proof-uploaded-agent", err);
    res.status(502).json({ error: message });
  }
});
app.post("/api/notifications/order-payment-recorded", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.orderId || !payload?.orderNumber) {
      res.status(400).json({ error: "Missing orderId or orderNumber" });
      return;
    }
    const subject = orderPaymentRecordedExecutiveSubject(payload);
    const html = buildOrderPaymentRecordedEmailHtml(payload);
    const sentTo = resolveRecipient(null);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.orderId, "payment-executive")
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("RESEND_API_KEY")) {
      res.status(503).json({ error: message });
      return;
    }
    console.error("[notify-server] order-payment-recorded", err);
    res.status(502).json({ error: message });
  }
});
app.post("/api/notifications/order-commission-paid-agent", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.orderId || !payload?.orderNumber || !payload?.agentEmail?.trim()) {
      res.status(400).json({ error: "Missing orderId, orderNumber, or agentEmail" });
      return;
    }
    const subject = orderCommissionPaidAgentSubject(payload);
    const html = buildOrderCommissionPaidAgentEmailHtml(payload);
    const sentTo = resolveRecipient(payload.agentEmail);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.orderId, "commission-paid-agent")
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("RESEND_API_KEY")) {
      res.status(503).json({ error: message });
      return;
    }
    console.error("[notify-server] order-commission-paid-agent", err);
    res.status(502).json({ error: message });
  }
});
app.post("/api/notifications/trip-driver-assigned", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.tripId || !payload?.tripNumber) {
      res.status(400).json({ error: "Missing tripId or tripNumber" });
      return;
    }
    const subject = tripDriverAssignedSubject(payload);
    const html = buildTripDriverAssignedEmailHtml(payload);
    const sentTo = resolveRecipient(payload.driverEmail);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.tripId, "driver-assigned")
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("RESEND_API_KEY")) {
      res.status(503).json({ error: message });
      return;
    }
    console.error("[notify-server] trip-driver-assigned", err);
    res.status(502).json({ error: message });
  }
});
app.post("/api/notifications/product-stock-alert", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.variantId || !payload?.productId || !payload?.sku) {
      res.status(400).json({ error: "Missing variantId, productId, or sku" });
      return;
    }
    if (!payload.severity || !payload.audience) {
      res.status(400).json({ error: "Missing severity or audience" });
      return;
    }
    const subject = productStockAlertSubject({
      sku: payload.sku,
      productName: payload.productName,
      size: payload.size ?? null,
      branchName: payload.branchName ?? null,
      severity: payload.severity,
      audience: payload.audience
    });
    const html = buildProductStockAlertEmailHtml(payload);
    const inputEmails = (payload.recipientEmails ?? []).map((e) => typeof e === "string" ? e.trim() : "").filter(Boolean);
    const targets = inputEmails.length > 0 ? inputEmails : [null];
    const uniqueRecipients = [...new Set(targets.map((email) => resolveRecipient(email)))];
    const sent = [];
    for (const sentTo of uniqueRecipients) {
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.variantId, `stock-${payload.severity}-${payload.audience}`)
      });
      sent.push({ id, sentTo });
    }
    res.json({ ok: true, subject, sentCount: sent.length, sent });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("RESEND_API_KEY")) {
      res.status(503).json({ error: message });
      return;
    }
    console.error("[notify-server] product-stock-alert", err);
    res.status(502).json({ error: message });
  }
});
app.post("/api/notifications/material-stock-alert", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.materialId || !payload?.sku) {
      res.status(400).json({ error: "Missing materialId or sku" });
      return;
    }
    if (!payload.severity || !payload.audience) {
      res.status(400).json({ error: "Missing severity or audience" });
      return;
    }
    const subject = materialStockAlertSubject({
      sku: payload.sku,
      name: payload.name,
      branchName: payload.branchName ?? null,
      severity: payload.severity,
      audience: payload.audience
    });
    const html = buildMaterialStockAlertEmailHtml(payload);
    const inputEmails = (payload.recipientEmails ?? []).map((e) => typeof e === "string" ? e.trim() : "").filter(Boolean);
    const targets = inputEmails.length > 0 ? inputEmails : [null];
    const uniqueRecipients = [...new Set(targets.map((email) => resolveRecipient(email)))];
    const sent = [];
    for (const sentTo of uniqueRecipients) {
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.materialId, `material-stock-${payload.severity}-${payload.audience}`)
      });
      sent.push({ id, sentTo });
    }
    res.json({ ok: true, subject, sentCount: sent.length, sent });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("RESEND_API_KEY")) {
      res.status(503).json({ error: message });
      return;
    }
    console.error("[notify-server] material-stock-alert", err);
    res.status(502).json({ error: message });
  }
});
app.post("/api/notifications/order-revised", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.orderId || !payload?.orderNumber) {
      res.status(400).json({ error: "Missing orderId or orderNumber" });
      return;
    }
    const subject = orderRevisedSubject(payload);
    const sentTo = resolveRecipient(null);
    const html = buildOrderRevisedEmailHtml(payload);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.orderId, "revised")
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("RESEND_API_KEY")) {
      res.status(503).json({ error: message });
      return;
    }
    console.error("[notify-server]", err);
    res.status(502).json({ error: message });
  }
});
app.post("/api/notifications/order-cancelled", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.orderId || !payload?.orderNumber || !payload.notifyTarget) {
      res.status(400).json({ error: "Missing orderId, orderNumber, or notifyTarget" });
      return;
    }
    const forAgent = payload.notifyTarget === "agent";
    const subject = orderCancelledSubject(payload, payload.notifyTarget);
    const sentTo = resolveRecipient(forAgent ? payload.agentEmail : null);
    const html = buildOrderCancelledEmailHtml(payload);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.orderId, `cancelled-${payload.notifyTarget}`)
    });
    res.json({ ok: true, id, sentTo, subject, notifyTarget: payload.notifyTarget });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("RESEND_API_KEY")) {
      res.status(503).json({ error: message });
      return;
    }
    console.error("[notify-server]", err);
    res.status(502).json({ error: message });
  }
});
app.post("/api/notifications/order-scheduled", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.orderId || !payload?.orderNumber || !payload.notifyTarget) {
      res.status(400).json({ error: "Missing orderId, orderNumber, or notifyTarget" });
      return;
    }
    const target = payload.notifyTarget;
    const subject = orderScheduledSubject(payload, target);
    const html = buildOrderScheduledEmailHtml(payload);
    if (target === "warehouse") {
      const emails = (payload.warehouseEmails ?? []).map((e) => e?.trim()).filter(Boolean);
      const targets = emails.length > 0 ? emails : [null];
      const uniqueRecipients = [...new Set(targets.map((email) => resolveRecipient(email)))];
      const sent = [];
      for (const sentTo2 of uniqueRecipients) {
        const { id: id2 } = await sendViaResend({
          to: sentTo2,
          subject,
          html,
          entityRef: emailEntityRef(payload.orderId, "scheduled-warehouse")
        });
        sent.push({ id: id2, sentTo: sentTo2 });
      }
      res.json({ ok: true, subject, sentCount: sent.length, sent, notifyTarget: target });
      return;
    }
    if (target === "agent") {
      const sentTo2 = resolveRecipient(payload.agentEmail);
      const { id: id2 } = await sendViaResend({
        to: sentTo2,
        subject,
        html,
        entityRef: emailEntityRef(payload.orderId, "scheduled-agent")
      });
      res.json({ ok: true, id: id2, sentTo: sentTo2, subject, notifyTarget: target });
      return;
    }
    const sentTo = resolveRecipient(null);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.orderId, "scheduled-executive")
    });
    res.json({ ok: true, id, sentTo, subject, notifyTarget: target });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("RESEND_API_KEY")) {
      res.status(503).json({ error: message });
      return;
    }
    console.error("[notify-server] order-scheduled", err);
    res.status(502).json({ error: message });
  }
});
app.post("/api/notifications/order-payment-overdue", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.orderId || !payload?.orderNumber || !payload?.notifyTarget) {
      res.status(400).json({ error: "Missing orderId, orderNumber, or notifyTarget" });
      return;
    }
    const target = payload.notifyTarget;
    const subject = orderPaymentOverdueSubject(payload, target);
    const html = buildOrderPaymentOverdueEmailHtml(payload);
    const sentTo = resolveRecipient(target === "agent" ? payload.agentEmail : null);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.orderId, `payment-overdue-${target}`)
    });
    res.json({ ok: true, id, sentTo, subject, notifyTarget: target });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("RESEND_API_KEY")) {
      res.status(503).json({ error: message });
      return;
    }
    console.error("[notify-server] order-payment-overdue", err);
    res.status(502).json({ error: message });
  }
});
app.post("/api/notifications/order-payment-overdue-customer", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.orderId || !payload?.orderNumber || !payload?.customerEmail?.trim()) {
      res.status(400).json({ error: "Missing orderId, orderNumber, or customerEmail" });
      return;
    }
    const subject = orderCustomerPaymentOverdueSubject(payload);
    const html = buildOrderCustomerPaymentOverdueEmailHtml(payload);
    const sentTo = resolveRecipient(payload.customerEmail);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.orderId, "customer-payment-overdue")
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("RESEND_API_KEY")) {
      res.status(503).json({ error: message });
      return;
    }
    console.error("[notify-server] order-payment-overdue-customer", err);
    res.status(502).json({ error: message });
  }
});
app.post("/api/link-preview", async (req, res) => {
  try {
    const url = typeof req.body?.url === "string" ? req.body.url.trim() : "";
    if (!/^https?:\/\//i.test(url)) {
      res.status(400).json({ ok: false, error: "Invalid url" });
      return;
    }
    const ogs = (await import("open-graph-scraper")).default;
    const { result, error } = await ogs({
      url,
      timeout: 6e3,
      fetchOptions: { headers: { "user-agent": "Mozilla/5.0 (compatible; LamtexBot/1.0)" } }
    });
    if (error || !result?.success) {
      res.json({ ok: false });
      return;
    }
    const r = result;
    const ogImage = r.ogImage;
    const imageRaw = Array.isArray(ogImage) ? ogImage[0]?.url : ogImage?.url;
    res.json({
      ok: true,
      url: r.ogUrl ?? r.requestUrl ?? url,
      title: r.ogTitle ?? r.twitterTitle ?? null,
      description: r.ogDescription ?? r.twitterDescription ?? null,
      image: imageRaw ?? null,
      siteName: r.ogSiteName ?? null
    });
  } catch (err) {
    console.error("[notify-server] link-preview", err);
    res.json({ ok: false });
  }
});
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    resendConfigured: Boolean(resendKey),
    emailOverride: readEnv("NOTIFICATIONS_EMAIL_OVERRIDE") ?? null,
    fromEmail
  });
});
app.use((err, _req, res, _next) => {
  if (res.headersSent) return;
  console.error("[notify-server] unhandled error", err);
  res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
});
app.use((_req, res) => {
  if (res.headersSent) return;
  console.warn("[notify-server] unmatched route", _req.method, _req.url);
  res.status(404).json({ error: "Not found", method: _req.method, path: _req.url });
});
var app_default = app;

// api/vercelEntry.ts
var vercelEntry_default = (0, import_serverless_http.default)(app_default);
