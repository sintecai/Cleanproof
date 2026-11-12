// Validates reviewed deployment intent, not the independently hosted Auth settings.
export const cleanproofStagingOrigin='https://cleanproof-sicy-preview.grassyelf128.chatgpt.site';
export function validateAuthDeployment(config){
 if(config.site_url!==cleanproofStagingOrigin)throw Error('Staging Site URL must be the exact deployed HTTPS origin.');
 const expected=cleanproofStagingOrigin+'/reset-password.html';
 if(config.uri_allow_list!==expected)throw Error('Allow only the exact recovery URL requested by the deployed application.');
 if(config.mailer_autoconfirm!==true)throw Error('Immediate signup requires Confirm email OFF.');
 for(const key of ['mailer_templates_confirmation_content','mailer_templates_recovery_content']){
  const template=config[key];if(typeof template!=='string'||!template.includes('{{ .ConfirmationURL }}')||/localhost|127\.0\.0\.1|\{\{\s*\.(Token|TokenHash|SiteURL|RedirectTo)\s*\}\}/i.test(template))throw Error('Use the supported ConfirmationURL link template, without localhost or a different callback protocol.');
 }
 return true;
}
