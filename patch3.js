import fs from 'fs';
let code = fs.readFileSync('src/pages/user/EventDetail.tsx', 'utf8');

code = code.replace(
`    } catch (e) {
      alert("Gagal menyimpan absensi");
    } finally {
      setActionLoading(false);
      setBase64Template(null);
    }`,
`    } catch (e) {
      alert("Gagal menyimpan absensi");
    } finally {
      setActionLoading(false);
    }`
);

code = code.replace(
`    } catch (error) {
      console.error(error);
      alert("Gagal generate PDF");
    } finally {
      setActionLoading(false);
    }
  };`,
`    } catch (error) {
      console.error(error);
      alert("Gagal generate PDF");
    } finally {
      setActionLoading(false);
      setBase64Template(null);
    }
  };`
);

fs.writeFileSync('src/pages/user/EventDetail.tsx', code);
