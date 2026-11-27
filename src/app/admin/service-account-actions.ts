"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../lib/supabase";
import { serviceUuid } from "../../lib/service";
import { dedicatedAccount, rotateServicePassword, serviceAccountAdmin, temporaryPassword, type CredentialAccount } from "../../lib/service-account-admin";

export async function createServiceAccount(restaurant: string, form: FormData) {
  const { db } = await requireAdmin();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const label = String(form.get("label") ?? "").trim();
  if (!serviceUuid.test(restaurant) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || label.length > 80) {
    return { error: "Verifica ristorante, indirizzo email e riferimento interno." };
  }
  const admin = serviceAccountAdmin();
  if (!admin) return { error: "Account Manager non configurato sul server." };
  const target = await db.from("swm_restaurants").select("id").eq("id", restaurant).maybeSingle();
  if (target.error || !target.data) return { error: "Ristorante non disponibile." };
  const ready = await admin.from("swm_service_accounts").select("user_id").limit(1);
  if (ready.error) return { error: "Verifica migrazione e credenziali server prima di creare l’account." };

  const password = temporaryPassword();
  const version = randomUUID();
  const created = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    app_metadata: { swm_service_account: true, swm_service_credential_version: version },
  });
  if (created.error) {
    if (["email_exists", "user_already_exists"].includes(created.error.code ?? "")) {
      return { error: "Email già presente in Auth. Verifica manualmente l’account. Nessuna associazione o modifica eseguita." };
    }
    return { error: "Creazione non confermata. Verifica manualmente Auth prima di riprovare." };
  }
  const user = created.data.user;
  const account: CredentialAccount = { user_id: user?.id ?? "", email, credential_version: version, state: "pending" };
  if (!dedicatedAccount(user, account)) return { error: "Identità dell’account non confermata. Verifica manualmente Auth." };
  const registered = await admin.rpc("swm_service_register_account", {
    account_user: account.user_id, account_email: email, version, target_restaurant: restaurant, internal_label: label || null,
  }).retry(false);
  if (registered.error) {
    // Solo un errore SQL deterministico garantisce il rollback dell'associazione.
    if (/^(22|23|42)/.test(registered.error.code) || registered.error.code === "PGRST202") {
      const current = await admin.auth.admin.getUserById(account.user_id);
      if (!current.error && dedicatedAccount(current.data.user, account)) {
        const removed = await admin.auth.admin.deleteUser(account.user_id);
        if (!removed.error) return { error: "Associazione non riuscita. Il nuovo account è stato rimosso." };
      }
    }
    return { error: "Associazione non confermata. Verifica Auth e la scheda del ristorante prima di riprovare." };
  }
  revalidatePath(`/admin/ristoranti/${restaurant}`);
  return { success: "Account creato e associato. Abilita l’associazione quando il cliente è pronto.", email, password };
}

export async function resetServiceAccount(restaurant: string, user: string, form: FormData) {
  const { db } = await requireAdmin();
  if (!serviceUuid.test(restaurant) || !serviceUuid.test(user) || form.get("confirm") !== "on") {
    return { error: "Conferma di aver verificato l’identità del cliente." };
  }
  const admin = serviceAccountAdmin();
  if (!admin) return { error: "Account Manager non configurato sul server." };
  const member = await db.from("swm_service_memberships").select("user_id")
    .eq("restaurant_id", restaurant).eq("user_id", user).maybeSingle();
  if (member.error || !member.data) return { error: "Account non associato a questo ristorante." };
  const gate = await admin.from("swm_service_accounts").select("user_id,email,credential_version,state").eq("user_id", user).maybeSingle();
  const account = gate.data as CredentialAccount | null;
  if (gate.error || !account || account.state === "changing") return { error: "Account non gestibile. Verifica lo stato con SuPeR." };
  const identity = await admin.auth.admin.getUserById(user);
  if (identity.error || !dedicatedAccount(identity.data.user, account)) return { error: "Account dedicato non verificato. Reset non eseguito." };
  const password = temporaryPassword();
  const result = await rotateServicePassword(admin, account, password, "pending");
  if (result.error) return result;
  return { success: "Password temporanea rigenerata per tutti i locali associati.", email: account.email, password };
}
