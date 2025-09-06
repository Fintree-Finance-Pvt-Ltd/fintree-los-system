// Describe each entity once; screens read from here.
export const ENTITIES = {
  dealer: {
    name: 'Dealer',
    apiBase: '/dealers',              // backend routes
    uiBase: '/dealers',               // frontend routes (for <Link>)
    entityKey: 'dealer',              // for /fields?entity=... and /docs/:entity/:id
    idField: 'dealer_id',             // pretty code column
    perms: { read:'DEALERS_READ', write:'DEALERS_WRITE', review:'DEALERS_REVIEW' },

    // Columns for the list grid (no need to include dynamic/custom fields here)
    listColumns: [
      { field: 'dealer_id', headerName: 'Dealer ID', width: 120 },
      { field: 'dealer_name', headerName: 'Dealer Name', flex: 1, minWidth: 200 },
      { field: 'name_as_per_invoice', headerName: 'Invoice Name', flex: 1, minWidth: 200 },
      { field: 'dealer_phone', headerName: 'Phone', width: 140 },
      { field: 'dealer_address', headerName: 'Address', flex: 1, minWidth: 220 },
      { field: 'email', headerName: 'Email', flex: 1, minWidth: 220 },
      { field: 'gst_no', headerName: 'GST No', width: 140 },
      { field: 'dealer_pan_card', headerName: 'PAN', width: 120 },
      { field: 'authorised_dealer_name', headerName: 'Authorised', flex: 1, minWidth: 180 },
      { field: 'is_active', headerName: 'Active', width: 100, type: 'boolean' },
      { field: 'created_at', headerName: 'Created', width: 180 },
      { field: 'status', headerName: 'Status', width: 130, type: 'status' },
    ],

    // Fields for the Add form + Excel importer
    formFields: [
      { name:'dealer_name',            label:'Dealer Name',           type:'text',    required:true,
        excelAliases:['Dealer Name','Name','Dealer'] },
      { name:'name_as_per_invoice',    label:'Name As Per Invoice',   type:'text',
        excelAliases:['Name as per Invoice','Invoice Name'] },
      { name:'dealer_phone',           label:'Dealer Mobile No',      type:'text',
        excelAliases:['Dealer Mobile No','Dealer Phone','Phone','Mobile'] },
      { name:'dealer_address',         label:'Dealer Address',         type:'text',
        excelAliases:['Dealer Address','Address'] },
      { name:'email',                  label:'Email',                  type:'email',
        excelAliases:['Email','E - Mail id','E-mail','E Mail'] },
      { name:'gst_no',                 label:'GST No',                 type:'text',
        excelAliases:['GST No','GST','GSTIN'] },
      { name:'dealer_pan_card',        label:'Dealer PAN',             type:'text',
        excelAliases:['Dealer PAN','PAN','PAN No'] },
      { name:'authorised_dealer_name', label:'Authorised Dealer Name', type:'text',
        excelAliases:['Authorised Dealer Name','Authorized Dealer Name'] },
      { name:'is_active',              label:'Active',                 type:'checkbox', defaultValue:true,
        excelAliases:['IsActive','Active','Status'] },
    ],
  },

  fin: {
    name: 'Financial Institute',
    apiBase: '/fin-institutes',
    uiBase: '/fin',
    entityKey: 'financial_institute',
    idField: 'fin_id',
    perms: { read:'FIN_READ', write:'FIN_WRITE', review:'FIN_REVIEW' },
    listColumns: [
      { field:'fin_id', headerName:'FIN ID', width:120 },
      { field:'name', headerName:'Name', flex:1, minWidth:220 },
      { field:'email', headerName:'Email', flex:1, minWidth:220 },
      { field:'phone', headerName:'Phone', width:160 },
      { field:'is_active', headerName:'Active', width:100, type:'boolean' },
      { field:'created_at', headerName:'Created', width:180 },
      { field:'status', headerName:'Status', width:130, type:'status' },
    ],
    formFields: [
      { name:'name', label:'Name', type:'text', required:true, excelAliases:['Name','Institute','FI Name'] },
      { name:'email', label:'Email', type:'email', excelAliases:['Email'] },
      { name:'phone', label:'Phone', type:'text', excelAliases:['Phone','Mobile'] },
      { name:'is_active', label:'Active', type:'checkbox', defaultValue:true, excelAliases:['Active','IsActive'] },
    ],
  },

  landlord: {
    name: 'Landlord',
    apiBase: '/landlords',
    uiBase: '/landlords',
    entityKey: 'landlord',
    idField: 'lnd_id',
    perms: { read:'LAND_READ', write:'LAND_WRITE', review:'LAND_REVIEW' },
    listColumns: [
      { field:'lnd_id', headerName:'LND ID', width:120 },
      { field:'name', headerName:'Name', flex:1, minWidth:220 },
      { field:'email', headerName:'Email', flex:1, minWidth:220 },
      { field:'phone', headerName:'Phone', width:160 },
      { field:'is_active', headerName:'Active', width:100, type:'boolean' },
      { field:'created_at', headerName:'Created', width:180 },
      { field:'status', headerName:'Status', width:130, type:'status' },
    ],
    formFields: [
      { name:'name', label:'Name', type:'text', required:true, excelAliases:['Name','Landlord Name'] },
      { name:'email', label:'Email', type:'email', excelAliases:['Email'] },
      { name:'phone', label:'Phone', type:'text', excelAliases:['Phone','Mobile'] },
      { name:'is_active', label:'Active', type:'checkbox', defaultValue:true, excelAliases:['Active','IsActive'] },
    ],
  },
};
