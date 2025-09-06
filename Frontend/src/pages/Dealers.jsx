import { useEffect, useState } from 'react';
import api from '../api/axios';

export default function Dealers() {
  const [data, setData] = useState({ rows: [], total: 0 });

  useEffect(() => {
    api.get('/dealers?limit=20&offset=0').then(res => setData(res.data));
  }, []);

  return (
    <div>
      <h3>Dealers</h3>
      <pre style={{ background:'#111', color:'#dedede', padding:12, borderRadius:8 }}>
        {JSON.stringify(data.rows, null, 2)}
      </pre>
    </div>
  );
}
