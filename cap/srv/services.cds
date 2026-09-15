using { inetum.template as db } from '../db/schema';

/**
 * Um service por perfil de acesso — ver ../patterns/service-layer.md.
 * AdminService: cadastro/configuração, majoritariamente leitura para quem não administra.
 * UserService:  operação do dia a dia, com edição via draft.
 */
@path    : 'api/admin'
@requires: 'authenticated-user'
service AdminService {
  @readonly
  entity Customer as projection on db.Customer;
}

@path    : 'api/user'
@requires: 'authenticated-user'
service UserService {
  @odata.draft.enabled
  entity Customer as projection on db.Customer;
}
