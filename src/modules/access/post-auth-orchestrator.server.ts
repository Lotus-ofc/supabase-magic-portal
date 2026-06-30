/** Ponte oficial Auth → Access (Regra de Ouro). Rotas Auth importam apenas daqui — nunca do barrel access. */
export {
  postAuthOnCallbackCompleted,
  postAuthOnInvitePasswordSet,
  postAuthOnRecoveryCompleted,
  postAuthOnPasswordChangedByUser,
  postAuthOnLoginSuccess,
} from "@/modules/access/post-auth.server";
